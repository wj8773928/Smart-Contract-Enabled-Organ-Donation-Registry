;; RecipientRegistration.clar

(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-RECIPIENT-ID u101)
(define-constant ERR-RECIPIENT-ALREADY-EXISTS u102)
(define-constant ERR-INVALID-BLOOD-TYPE u103)
(define-constant ERR-INVALID-ORGAN-NEEDED u104)
(define-constant ERR-INVALID-URGENCY u105)
(define-constant ERR-INVALID-WAIT-TIME u106)
(define-constant ERR-INVALID-LOCATION u107)
(define-constant ERR-INVALID-DIAGNOSIS u108)
(define-constant ERR-INVALID-AGE u109)
(define-constant ERR-INVALID-HEIGHT u110)
(define-constant ERR-INVALID-WEIGHT u111)
(define-constant ERR-INVALID-BMI u112)
(define-constant ERR-INVALID-CONTACT u113)
(define-constant ERR-INVALID-ETHNICITY u114)
(define-constant ERR-INVALID-GENDER u115)
(define-constant ERR-INVALID-VERIFICATION u116)
(define-constant ERR-INVALID-REGISTRATION-FEE u117)
(define-constant ERR-INVALID-MEDICAL-HISTORY u118)
(define-constant ERR-RECIPIENT-NOT-FOUND u119)

(define-data-var next-recipient-id uint u0)
(define-data-var registration-fee uint u300)
(define-data-var admin principal tx-sender)
(define-data-var verified-oracle (optional principal) none)

(define-map Recipients
  { recipient-id: uint }
  {
    principal: principal,
    blood-type: (string-ascii 8),
    organ-needed: (string-ascii 32),
    urgency-level: uint,
    wait-days: uint,
    age: uint,
    height: uint,
    weight: uint,
    bmi: uint,
    location: (string-ascii 100),
    diagnosis: (string-ascii 200),
    medical-history-hash: (buff 32),
    contact: (string-ascii 100),
    gender: (string-ascii 10),
    ethnicity: (string-ascii 50),
    timestamp: uint,
    verified: bool,
    active: bool
  }
)

(define-map RecipientByPrincipal principal uint)

(define-read-only (get-recipient (id uint))
  (map-get? Recipients { recipient-id: id })
)

(define-read-only (get-recipient-by-principal (user principal))
  (map-get? RecipientByPrincipal user)
)

(define-read-only (get-next-recipient-id)
  (ok (var-get next-recipient-id))
)

(define-private (validate-blood-type (blood (string-ascii 8)))
  (if (or (is-eq blood "A+") (is-eq blood "A-") (is-eq blood "B+") (is-eq blood "B-") (is-eq blood "O+") (is-eq blood "O-") (is-eq blood "AB+") (is-eq blood "AB-"))
      (ok true)
      (err ERR-INVALID-BLOOD-TYPE))
)

(define-private (validate-organ-needed (organ (string-ascii 32)))
  (if (or (is-eq organ "heart") (is-eq organ "liver") (is-eq organ "kidney") (is-eq organ "lung") (is-eq organ "pancreas") (is-eq organ "intestine"))
      (ok true)
      (err ERR-INVALID-ORGAN-NEEDED))
)

(define-private (validate-urgency (urgency uint))
  (if (and (>= urgency u1) (<= urgency u5))
      (ok true)
      (err ERR-INVALID-URGENCY))
)

(define-private (validate-wait-days (days uint))
  (if (<= days u3650)
      (ok true)
      (err ERR-INVALID-WAIT-TIME))
)

(define-private (validate-age (age uint))
  (if (and (>= age u0) (<= age u100))
      (ok true)
      (err ERR-INVALID-AGE))
)

(define-private (validate-height (height uint))
  (if (and (>= height u50) (<= height u220))
      (ok true)
      (err ERR-INVALID-HEIGHT))
)

(define-private (validate-weight (weight uint))
  (if (and (>= weight u10) (<= weight u200))
      (ok true)
      (err ERR-INVALID-WEIGHT))
)

(define-private (validate-bmi (bmi uint))
  (if (and (>= bmi u10) (<= bmi u50))
      (ok true)
      (err ERR-INVALID-BMI))
)

(define-private (validate-location (loc (string-ascii 100)))
  (if (> (len loc) u0)
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-diagnosis (diag (string-ascii 200)))
  (if (> (len diag) u0)
      (ok true)
      (err ERR-INVALID-DIAGNOSIS))
)

(define-private (validate-medical-history-hash (hash (buff 32)))
  (if (is-some hash)
      (ok true)
      (err ERR-INVALID-MEDICAL-HISTORY))
)

(define-private (validate-contact (contact (string-ascii 100)))
  (if (> (len contact) u0)
      (ok true)
      (err ERR-INVALID-CONTACT))
)

(define-private (validate-gender (gender (string-ascii 10)))
  (if (or (is-eq gender "male") (is-eq gender "female") (is-eq gender "other"))
      (ok true)
      (err ERR-INVALID-GENDER))
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

(define-public (register-recipient
  (blood-type (string-ascii 8))
  (organ-needed (string-ascii 32))
  (urgency-level uint)
  (wait-days uint)
  (age uint)
  (height uint)
  (weight uint)
  (bmi uint)
  (location (string-ascii 100))
  (diagnosis (string-ascii 200))
  (medical-history-hash (buff 32))
  (contact (string-ascii 100))
  (gender (string-ascii 10))
  (ethnicity (string-ascii 50))
)
  (let ((recipient-id (var-get next-recipient-id)))
    (try! (validate-blood-type blood-type))
    (try! (validate-organ-needed organ-needed))
    (try! (validate-urgency urgency-level))
    (try! (validate-wait-days wait-days))
    (try! (validate-age age))
    (try! (validate-height height))
    (try! (validate-weight weight))
    (try! (validate-bmi bmi))
    (try! (validate-location location))
    (try! (validate-diagnosis diagnosis))
    (try! (validate-medical-history-hash (some medical-history-hash)))
    (try! (validate-contact contact))
    (try! (validate-gender gender))
    (asserts! (is-none (get-recipient-by-principal tx-sender)) (err ERR-RECIPIENT-ALREADY-EXISTS))
    (unwrap! (stx-transfer? (var-get registration-fee) tx-sender (var-get admin)) (err ERR-INVALID-REGISTRATION-FEE))
    (map-set Recipients { recipient-id: recipient-id }
      {
        principal: tx-sender,
        blood-type: blood-type,
        organ-needed: organ-needed,
        urgency-level: urgency-level,
        wait-days: wait-days,
        age: age,
        height: height,
        weight: weight,
        bmi: bmi,
        location: location,
        diagnosis: diagnosis,
        medical-history-hash: medical-history-hash,
        contact: contact,
        gender: gender,
        ethnicity: ethnicity,
        timestamp: block-height,
        verified: false,
        active: true
      }
    )
    (map-set RecipientByPrincipal tx-sender recipient-id)
    (var-set next-recipient-id (+ recipient-id u1))
    (print { event: "recipient-registered", id: recipient-id })
    (ok recipient-id)
  )
)

(define-public (verify-recipient (recipient-id uint))
  (let ((recipient (get-recipient recipient-id)))
    (asserts! (is-some (var-get verified-oracle)) (err ERR-INVALID-VERIFICATION))
    (asserts! (is-eq tx-sender (unwrap! (var-get verified-oracle) (err ERR-INVALID-VERIFICATION))) (err ERR-NOT-AUTHORIZED))
    (match recipient
      r
        (begin
          (map-set Recipients { recipient-id: recipient-id }
            (merge r { verified: true })
          )
          (ok true)
        )
      (err ERR-RECIPIENT-NOT-FOUND)
    )
  )
)

(define-public (deactivate-recipient (recipient-id uint))
  (let ((recipient (get-recipient recipient-id)))
    (match recipient
      r
        (begin
          (asserts! (or (is-eq tx-sender (get principal r)) (is-eq tx-sender (var-get admin))) (err ERR-NOT-AUTHORIZED))
          (map-set Recipients { recipient-id: recipient-id }
            (merge r { active: false })
          )
          (ok true)
        )
      (err ERR-RECIPIENT-NOT-FOUND)
    )
  )
)

(define-public (update-recipient-contact (recipient-id uint) (new-contact (string-ascii 100)))
  (let ((recipient (get-recipient recipient-id)))
    (try! (validate-contact new-contact))
    (match recipient
      r
        (begin
          (asserts! (is-eq tx-sender (get principal r)) (err ERR-NOT-AUTHORIZED))
          (map-set Recipients { recipient-id: recipient-id }
            (merge r { contact: new-contact })
          )
          (ok true)
        )
      (err ERR-RECIPIENT-NOT-FOUND)
    )
  )
)

(define-public (update-wait-days (recipient-id uint) (new-wait-days uint))
  (let ((recipient (get-recipient recipient-id)))
    (try! (validate-wait-days new-wait-days))
    (match recipient
      r
        (begin
          (asserts! (is-eq tx-sender (get principal r)) (err ERR-NOT-AUTHORIZED))
          (map-set Recipients { recipient-id: recipient-id }
            (merge r { wait-days: new-wait-days })
          )
          (ok true)
        )
      (err ERR-RECIPIENT-NOT-FOUND)
    )
  )
)

(define-public (get-recipient-count)
  (ok (var-get next-recipient-id))
)