### SPEC 
Extracts transactional facts from tool results as they come in, building a persistent case facts block. The block is injected at the start of every subsequent coordinator prompt. Facts once extracted are never lost to summarisation. Handles billing facts (invoice, payments) and returns facts (order, eligibility) separately. Updates incrementally as new tool results arrive.

### PREDICTED EXECUTION 
// After get_invoice returns:
extractBillingFacts({ invoice_id: "INV-1001", amount: 12500,
                      payment_count: 2, status: "paid" })
→ caseFacts.billing = {
    invoice_id: "INV-1001",
    claimed_amount_pkr: 12500,
    payment_count: 2
  }

// After check_payment_history returns:
extractPaymentFacts({ payments: [
  { payment_id: "PAY-8001", date: "2026-08-01", amount: 12500 },
  { payment_id: "PAY-8002", date: "2026-08-02", amount: 12500 }
]})
→ caseFacts.billing.duplicate_payment_id = "PAY-8002"
→ caseFacts.billing.duplicate_date = "2026-08-02"
→ caseFacts.billing.duplicate_amount_pkr = 12500




### SPEC 
Evaluates whether a support case should be escalated to a human agent. Uses exactly three structural criteria — never sentiment. Returns a structured escalation decision with the triggering criterion, a structured handoff object, and the recommended priority. The handoff object contains everything a human agent needs without access to the conversation transcript.



### PREDICTED EXECUTION 
evaluate({
  customerMessage: "I want to speak to a manager",
  caseFacts: { customer_id: "C-1001", billing: { duplicate_amount_pkr: 12500 } },
  resolutionAttempts: 0,
  hasPolicyGap: false
})
→ {
    shouldEscalate: true,
    trigger: "customer_demand",
    handoff: {
      customer_id: "C-1001",
      trigger: "Customer explicitly requested human agent",
      facts_summary: "...",
      recommended_action: "Review duplicate charge of PKR 12,500",
      priority: "high"
    }
  }

evaluate({
  customerMessage: "THIS IS RIDICULOUS I AM SO ANGRY",
  caseFacts: { customer_id: "C-1001", billing: { duplicate_amount_pkr: 12500 } },
  resolutionAttempts: 0,
  hasPolicyGap: false
})
→ {
    shouldEscalate: false,
    trigger: null,
    reason: "Angry tone is not an escalation trigger. Issue is within automated resolution scope."
  }