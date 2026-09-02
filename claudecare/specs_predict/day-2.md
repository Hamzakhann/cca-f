### SPEC 
billingAgent.js exports an async function runBillingAgent(context). It uses loop.js to run a Claude agent that specialises in billing disputes. It has access to two mock tools: get_invoice and check_payment_history. It receives all customer and issue context as a string parameter and returns a structured text result: whether a refund is warranted, why, and what the recommended action is.

### PREDICTED EXECUTION 
Customer: Ahmed Ali (C-1001)
Issue: claims double charge on invoice INV-4492, PKR 12,500
Task: investigate and determine if refund is warranted

Iteration 1 | stop_reason: tool_use
Tool call: get_invoice | args: { invoice_id: "INV-4492" }
Tool result: { status: "paid", amount: 12500, payment_count: 2 }
Iteration 2 | stop_reason: tool_use
Tool call: check_payment_history | args: { customer_id: "C-1001" }
Tool result: { payments: [{ date: "2026-07-01", amount: 12500 }, { date: "2026-07-02", amount: 12500 }] }
Iteration 3 | stop_reason: end_turn
Result: "Refund warranted. Customer was charged twice on the same invoice..."


### SPEC 
returnsAgent.js exports runReturnsAgent(context). Specialises in returns and refunds. Has mock tools: get_order and check_return_eligibility. Returns whether the return is eligible, the reason, and the recommended action.

### PREDICTED EXECUTION 
Customer: Ahmed Ali (C-1001)
Issue: wants to return laptop purchased 2026-06-20, order ORD-7723
Task: determine return eligibility

Iteration 1 | stop_reason: tool_use
Tool call: get_order | args: { order_id: "ORD-7723" }
Tool result: { item: "Laptop", purchase_date: "2026-06-20", amount: 95000 }
Iteration 2 | stop_reason: tool_use
Tool call: check_return_eligibility | args: { order_id: "ORD-7723", days_since_purchase: 23 }
Tool result: { eligible: true, reason: "within 30-day return window", refund_amount: 95000 }
Iteration 3 | stop_reason: end_turn
Result: "Return eligible. Order ORD-7723 falls within the 30-day window..."


### SPEC 
coordinator.js exports runCoordinator(userMessage). It is a Claude agent whose only job is to read the user's request, decide which subagents to involve, package the relevant context, run the subagents (in parallel when independent), and synthesise a final response. It has no business-logic tools. Its only available action is to call subagents.

### PREDICTED EXECUTION 
Given: "Customer Ahmed Ali (C-1001) is disputing a billing charge and also wants to return a laptop."

Coordinator Iteration 1:
  Reads request
  Decides: both billing AND returns are needed
  Packages context for each subagent
  Launches both subagents in parallel

[billingAgent and returnsAgent run simultaneously]

Coordinator Iteration 2 (synthesis):
  Receives both results
  stop_reason: end_turn
  Final: synthesised resolution covering both issues