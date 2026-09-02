### SPEC 
normalizer.js exports a PostToolUse hook function normalizeToolResult(toolName, rawResult). It runs after get_invoice or check_payment_history returns. If the result contains a date field that is a Unix timestamp (a number), it converts it to ISO 8601 date string format (YYYY-MM-DD). If the result contains a numeric status field, it converts status codes 1/2/3 to "active"/"suspended"/"closed". All other tools and all other fields pass through unchanged. Returns the transformed result as a JSON string.

### PREDICTED EXECUTION 
Given this raw result from get_invoice:

json
{ "invoice_id": "INV-1001", "date": 1754006400, "status": 2, "amount": 12500 }

Expected output from the hook:

json
{ "invoice_id": "INV-1001", "date": "2025-08-01", "status": "suspended", "amount": 12500 }

Given this raw result from get_order (a tool the hook should NOT transform):

json
{ "order_id": "ORD-5001", "date": "2026-08-01", "amount": 15000 }

Expected output (pass through unchanged):

json
{ "order_id": "ORD-5001", "date": "2026-08-01", "amount": 15000 }

Write both predictions down before building.



### SPEC 
refundGuard.js exports a PreToolCall hook function guardRefund(toolName, toolArgs). It runs before any tool executes. If the tool is process_refund and toolArgs.amount exceeds PKR 50,000: block the call, return a structured redirect instructing Claude to call escalate_to_human instead with the customer ID and refund amount. If the tool is process_refund and toolArgs.amount is 50,000 or below: allow the call. For all other tools: allow the call. Logs every interception with the amount and decision.

### PREDICTED EXECUTION 
guardRefund('process_refund', { customer_id: 'C-1001', amount: 49999 })
→ { blocked: false }
→ LOG: "RefundGuard: PKR 49,999 — ALLOWED"

guardRefund('process_refund', { customer_id: 'C-1001', amount: 50000 })
→ { blocked: false }
→ LOG: "RefundGuard: PKR 50,000 — ALLOWED"

guardRefund('process_refund', { customer_id: 'C-1001', amount: 50001 })
→ { blocked: true, redirectTo: 'escalate_to_human', message: "..." }
→ LOG: "RefundGuard: PKR 50,001 — BLOCKED → escalate_to_human"

guardRefund('get_invoice', { invoice_id: 'INV-1001' })
→ { blocked: false }
→ LOG: nothing (non-refund tools pass silently)

