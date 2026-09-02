Category    | isRetryable | Why
────────────────────────────────────────────────────────
transient   |    true     | Cause is temporary — retry may succeed
validation  |    true     | Fix the input — retry with corrected data
permission  |    false    | Authority won't change on retry
business    |    false    | Policy won't change on retry



Access failure:
  get_customer({ customer_id: "C-1001" }) times out
  → isError: true, errorCategory: "transient", isRetryable: true
  → The tool failed — Claude should retry or wait

Valid empty result:
  check_payment_history({ customer_id: "C-1001" })
  → { payments: [] }
  → The tool succeeded — customer genuinely has no payment history

NEVER conflate these two:
  ❌ Returning { payments: [] } when the database timed out
  → Claude thinks the customer has no payment history
  → Investigation concludes "no duplicate found"
  → Customer is wrongly denied a refund
  → The real error is invisible