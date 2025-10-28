;; DonorRegistration.clar

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-DONOR-ID u101)
(define-constant ERR-DONOR-ALREADY-EXISTS u102)
(define-constant ERR-INVALID-BLOOD-TYPE u103)
(define-constant ERR-INVALID-ORGAN-TYPE u104)
(define-constant ERR-INVALID-AGE u105)
(define-constant ERR-INVALID-LOCATION u106)
(define-constant ERR-INVALID-CONSENT u107)
(define-constant ERR-INVALID-HEALTH-STATUS u108)
(define-constant ERR-INVALID-WEIGHT u109)
(define-constant ERR-DONOR-NOT-FOUND u110)
(define-constant ERR-INVALID-TIMESTAMP u111)
(define-constant ERR-INVALID-GENDER u112)
(define-constant ERR-INVALID-CONTACT u113)
(define-constant ERR-INVALID-ETHNICITY u114)
(define-constant ERR-INVALID-REGISTRY-STATUS u115)
(define-constant ERR-INVALID-VERIFICATION u116)
(define-constant ERR-INVALID-HEIGHT u117)
(define-constant ERR-INVALID-BMI u118)
(define-constant ERR-INVALID-REGISTRATION-FEE u119)

(define-data-var next-donor-id uint u0)
(define-data-var registration-fee uint u250)
(define-data-var admin principal tx-sender)
(define-data-var verified-oracle (optional principal) none)

(define-map Donors
  { donor-id: uint }
  {
    principal: principal,
    blood-type: (string-ascii 8),
    organ-type: (string-ascii 32),
    age: uint,
    weight: uint,
    height: uint,
    bmi: uint,
    location: (string-ascii 100),
    consent-hash: (buff 32),
    health-status: uint,
    gender: (string-ascii 10),
    ethnicity: (string-ascii 50),
    contact: (string-ascii 100),
    timestamp: uint,
    verified: bool,
    active: bool
  }
)

(define-map DonorByPrincipal principal uint)

(define-read-only (get-donor (id uint))
  (map-get? Donors { donor-id: id })
)

(define-read-only (get-donor-by-principal (user principal))
  (map-get? DonorByPrincipal user)
)

(define-read-only (get-next-donor-id)
  (ok (var-get next-donor-id))
)

(define-private (validate-blood-type (blood (string-ascii 8)))
  (if (or (is-eq blood "A+") (is-eq blood "A-") (is-eq blood "B+") (is-eq blood "B-") (is-eq blood "O+") (is-eq blood "O-") (is-eq blood "AB+") (is-eq blood "AB-"))
      (ok true)
      (err ERR-INVALID-BLOOD-TYPE))
)

(define-private (validate-organ-type (organ (string-ascii 32)))
  (if (or (is-eq organ "heart") (is-eq organ "liver") (is-eq organ "kidney") (is-eq organ "lung") (is-eq organ "pancreas") (is-eq organ "intestine"))
      (ok true)
      (err ERR-INVALID-ORGAN-TYPE))
)

(define-private (validate-age (age uint))
  (if (and (>= age u18) (<= age u80))
      (ok true)
      (err ERR-INVALID-AGE))
)

(define-private (validate-weight (weight uint))
  (if (and (>= weight u40) (<= weight u150))
      (ok true)
      (err ERR-INVALID-WEIGHT))
)

(define-private (validate-height (height uint))
  (if (and (>= height u140) (<= height u220))
      (ok true)
      (err ERR-INVALID-HEIGHT))
)

(define-private (validate-bmi (bmi uint))
  (if (and (>= bmi u15) (<= bmi u40))
      (ok true)
      (err ERR-INVALID-BMI))
)

(define-private (validate-location (loc (string-ascii 100)))
  (if (> (len loc) u0)
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-consent-hash (hash (buff 32)))
  (if (is-some hash)
      (ok true)
      (err ERR-INVALID-CONSENT))
)

(define-private (validate-health-status (status uint))
  (if (and (>= status u1) (<= status u10))
      (ok true)
      (err ERR-INVALID-HEALTH-STATUS))
)

(define-private (validate-gender (gender (string-ascii 10)))
  (if (or (is-eq gender "male") (is-eq gender "female") (is-eq gender "other"))
      (ok true)
      (err ERR-INVALID-GENDER))
)

(define-private (validate-contact (contact (string-ascii 100)))
  (if (> (len contact) u0)
      (ok true)
      (err ERR-INVALID-CONTACT))
)

(define-public (set-verified-oracle (oracle principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set verified-oracle (some oracle))
    (ok true)
  )
)

(define-public (set-registration-fee (fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set registration-fee fee)
    (ok true)
  )
)

(define-public (register-donor
  (blood-type (string-ascii 8))
  (organ-type (string-ascii 32))
  (age uint)
  (weight uint)
  (height uint)
  (bmi uint)
  (location (string-ascii 100))
  (consent-hash (buff 32))
  (health-status uint)
  (gender (string-ascii 10))
  (ethnicity (string-ascii 50))
  (contact (string-ascii 100))
)
  (let ((donor-id (var-get next-donor-id)))
    (try! (validate-blood-type blood-type))
    (try! (validate-organ-type organ-type))
    (try! (validate-age age))
    (try! (validate-weight weight))
    (try! (validate-height height))
    (try! (validate-bmi bmi))
    (try! (validate-location location))
    (try! (validate-consent-hash (some consent-hash)))
    (try! (validate-health-status health-status))
    (try! (validate-gender gender))
    (try! (validate-contact contact))
    (asserts! (is-none (get-donor-by-principal tx-sender)) (err ERR-DONOR-ALREADY-EXISTS))
    (unwrap! (stx-transfer? (var-get registration-fee) tx-sender (var-get admin)) (err ERR-INVALID-REGISTRATION-FEE))
    (map-set Donors { donor-id: donor-id }
      {
        principal: tx-sender,
        blood-type: blood-type,
        organ-type: organ-type,
        age: age,
        weight: weight,
        height: height,
        bmi: bmi,
        location: location,
        consent-hash: consent-hash,
        health-status: health-status,
        gender: gender,
        ethnicity: ethnicity,
        contact: contact,
        timestamp: block-height,
        verified: false,
        active: true
      }
    )
    (map-set DonorByPrincipal tx-sender donor-id)
    (var-set next-donor-id (+ donor-id u1))
    (print { event: "donor-registered", id: donor-id })
    (ok donor-id)
  )
)

(define-public (verify-donor (donor-id uint))
  (let ((donor (get-donor donor-id)))
    (asserts! (is-some (var-get verified-oracle)) (err ERR-INVALID-VERIFICATION))
    (asserts! (is-eq tx-sender (unwrap! (var-get verified-oracle) (err ERR-INVALID-VERIFICATION))) (err ERR-NOT-AUTHORIZED))
    (match donor
      d
        (begin
          (map-set Donors { donor-id: donor-id }
            (merge d { verified: true })
          )
          (ok true)
        )
      (err ERR-DONOR-NOT-FOUND)
    )
  )
)

(define-public (deactivate-donor (donor-id uint))
  (let ((donor (get-donor donor-id)))
    (match donor
      d
        (begin
          (asserts! (or (is-eq tx-sender (get principal d)) (is-eq tx-sender (var-get admin))) (err ERR-NOT-AUTHORIZED))
          (map-set Donors { donor-id: donor-id }
            (merge d { active: false })
          )
          (ok true)
        )
      (err ERR-DONOR-NOT-FOUND)
    )
  )
)

(define-public (update-donor-contact (donor-id uint) (new-contact (string-ascii 100)))
  (let ((donor (get-donor donor-id)))
    (try! (validate-contact new-contact))
    (match donor
      d
        (begin
          (asserts! (is-eq tx-sender (get principal d)) (err ERR-NOT-AUTHORIZED))
          (map-set Donors { donor-id: donor-id }
            (merge d { contact: new-contact })
          )
          (ok true)
        )
      (err ERR-DONOR-NOT-FOUND)
    )
  )
)

(define-public (get-donor-count)
  (ok (var-get next-donor-id))
)