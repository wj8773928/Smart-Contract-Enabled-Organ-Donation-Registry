(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-DONOR u101)
(define-constant ERR-INVALID-RECIPIENT u102)
(define-constant ERR-NO-MATCH u103)
(define-constant ERR-INVALID-ORGAN-TYPE u104)
(define-constant ERR-INVALID-BLOOD-TYPE u105)
(define-constant ERR-INVALID-URGENCY u106)
(define-constant ERR-INVALID-LOCATION u107)
(define-constant ERR-INVALID-SCORE u108)
(define-constant ERR-MATCH-ALREADY-EXISTS u109)
(define-constant ERR-INVALID-TIMESTAMP u110)
(define-constant ERR-RECIPIENT-NOT-WAITING u111)
(define-constant ERR-DONOR-NOT-AVAILABLE u112)
(define-constant ERR-INVALID-PRIORITY u113)
(define-constant ERR-INVALID-COMPATIBILITY u114)
(define-constant ERR-MAX-MATCHES-EXCEEDED u115)
(define-constant ERR-INVALID-ALLOCATION-RULE u116)
(define-constant ERR-ORACLE-NOT-VERIFIED u117)
(define-constant ERR-INVALID-HEALTH-STATUS u118)
(define-constant ERR-INVALID-AGE u119)
(define-constant ERR-INVALID-WEIGHT u120)

(define-data-var next-match-id uint u0)
(define-data-var max-matches uint u10000)
(define-data-var matching-fee uint u500)
(define-data-var oracle-contract (optional principal) none)
(define-data-var admin principal tx-sender)

(define-map Matches
  { match-id: uint }
  {
    donor-id: uint,
    recipient-id: uint,
    organ-type: (string-ascii 32),
    blood-type: (string-ascii 8),
    urgency-level: uint,
    location-score: uint,
    wait-time: uint,
    match-score: uint,
    timestamp: uint,
    status: bool
  }
)

(define-map DonorScores
  { donor-id: uint }
  { compatibility-score: uint, health-status: uint, age: uint, weight: uint }
)

(define-map RecipientPriorities
  { recipient-id: uint }
  { priority-score: uint, urgency: uint, wait-days: uint }
)

(define-map AllocationRules
  { rule-id: uint }
  { weight-urgency: uint, weight-wait: uint, weight-location: uint, min-score: uint }
)

(define-read-only (get-match (id uint))
  (map-get? Matches { match-id: id })
)

(define-read-only (get-donor-score (id uint))
  (map-get? DonorScores { donor-id: id })
)

(define-read-only (get-recipient-priority (id uint))
  (map-get? RecipientPriorities { recipient-id: id })
)

(define-read-only (get-allocation-rule (id uint))
  (map-get? AllocationRules { rule-id: id })
)

(define-private (validate-organ-type (organ (string-ascii 32)))
  (if (or (is-eq organ "heart") (is-eq organ "liver") (is-eq organ "kidney") (is-eq organ "lung"))
      (ok true)
      (err ERR-INVALID-ORGAN-TYPE))
)

(define-private (validate-blood-type (blood (string-ascii 8)))
  (if (or (is-eq blood "A+") (is-eq blood "A-") (is-eq blood "B+") (is-eq blood "B-") (is-eq blood "O+") (is-eq blood "O-") (is-eq blood "AB+") (is-eq blood "AB-"))
      (ok true)
      (err ERR-INVALID-BLOOD-TYPE))
)

(define-private (validate-urgency (urgency uint))
  (if (and (>= urgency u1) (<= urgency u5))
      (ok true)
      (err ERR-INVALID-URGENCY))
)

(define-private (validate-location-score (score uint))
  (if (<= score u100)
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-match-score (score uint))
  (if (>= score u50)
      (ok true)
      (err ERR-INVALID-SCORE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-priority (priority uint))
  (if (<= priority u100)
      (ok true)
      (err ERR-INVALID-PRIORITY))
)

(define-private (validate-compatibility (comp uint))
  (if (<= comp u100)
      (ok true)
      (err ERR-INVALID-COMPATIBILITY))
)

(define-private (validate-health-status (status uint))
  (if (and (>= status u1) (<= status u10))
      (ok true)
      (err ERR-INVALID-HEALTH-STATUS))
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

(define-private (calculate-match-score (urgency uint) (wait uint) (location uint) (rule-id uint))
  (let ((rule (unwrap! (get-allocation-rule rule-id) (err ERR-INVALID-ALLOCATION-RULE))))
    (+ (* urgency (get weight-urgency rule)) (* wait (get weight-wait rule)) (* location (get weight-location rule)))
  )
)

(define-public (set-oracle-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set oracle-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-matches (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set max-matches new-max)
    (ok true)
  )
)

(define-public (set-matching-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (var-set matching-fee new-fee)
    (ok true)
  )
)

(define-public (add-allocation-rule (rule-id uint) (weight-urgency uint) (weight-wait uint) (weight-location uint) (min-score uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (map-set AllocationRules { rule-id: rule-id }
      { weight-urgency: weight-urgency, weight-wait: weight-wait, weight-location: weight-location, min-score: min-score })
    (ok true)
  )
)

(define-public (register-donor-score (donor-id uint) (compatibility uint) (health uint) (age uint) (weight uint))
  (begin
    (try! (validate-compatibility compatibility))
    (try! (validate-health-status health))
    (try! (validate-age age))
    (try! (validate-weight weight))
    (map-set DonorScores { donor-id: donor-id }
      { compatibility-score: compatibility, health-status: health, age: age, weight: weight })
    (ok true)
  )
)

(define-public (register-recipient-priority (recipient-id uint) (priority uint) (urgency uint) (wait-days uint))
  (begin
    (try! (validate-priority priority))
    (try! (validate-urgency urgency))
    (map-set RecipientPriorities { recipient-id: recipient-id }
      { priority-score: priority, urgency: urgency, wait-days: wait-days })
    (ok true)
  )
)

(define-public (execute-match
  (donor-id uint)
  (recipient-id uint)
  (organ-type (string-ascii 32))
  (blood-type (string-ascii 8))
  (urgency-level uint)
  (location-score uint)
  (wait-time uint)
  (rule-id uint)
)
  (let (
        (next-id (var-get next-match-id))
        (current-max (var-get max-matches))
        (oracle (var-get oracle-contract))
        (donor (get-donor-score donor-id))
        (recipient (get-recipient-priority recipient-id))
        (score (calculate-match-score urgency-level wait-time location-score rule-id))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-MATCHES-EXCEEDED))
    (try! (validate-organ-type organ-type))
    (try! (validate-blood-type blood-type))
    (try! (validate-urgency urgency-level))
    (try! (validate-location-score location-score))
    (try! (validate-match-score score))
    (asserts! (is-some donor) (err ERR-INVALID-DONOR))
    (asserts! (is-some recipient) (err ERR-INVALID-RECIPIENT))
    (asserts! (is-some oracle) (err ERR-ORACLE-NOT-VERIFIED))
    (unwrap! (stx-transfer? (var-get matching-fee) tx-sender (unwrap! oracle (err ERR-ORACLE-NOT-VERIFIED))) (err ERR-NOT-AUTHORIZED))
    (map-set Matches { match-id: next-id }
      {
        donor-id: donor-id,
        recipient-id: recipient-id,
        organ-type: organ-type,
        blood-type: blood-type,
        urgency-level: urgency-level,
        location-score: location-score,
        wait-time: wait-time,
        match-score: score,
        timestamp: block-height,
        status: true
      }
    )
    (var-set next-match-id (+ next-id u1))
    (print { event: "match-executed", id: next-id })
    (ok next-id)
  )
)

(define-public (update-match-status (match-id uint) (new-status bool))
  (let ((match (map-get? Matches { match-id: match-id })))
    (match match
      m
        (begin
          (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
          (map-set Matches { match-id: match-id }
            {
              donor-id: (get donor-id m),
              recipient-id: (get recipient-id m),
              organ-type: (get organ-type m),
              blood-type: (get blood-type m),
              urgency-level: (get urgency-level m),
              location-score: (get location-score m),
              wait-time: (get wait-time m),
              match-score: (get match-score m),
              timestamp: (get timestamp m),
              status: new-status
            }
          )
          (print { event: "match-status-updated", id: match-id, status: new-status })
          (ok true)
        )
      (err ERR-NO-MATCH)
    )
  )
)

(define-public (get-match-count)
  (ok (var-get next-match-id))
)