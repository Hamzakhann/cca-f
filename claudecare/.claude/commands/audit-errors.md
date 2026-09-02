# /audit-errors

Audits all 7 ClaudeCare MCP tool executors for structured
error response compliance.

Steps:
1. For each tool in src/mcp/tools/:
   get_customer, lookup_order, process_refund, escalate_to_human,
   get_invoice, check_payment_history, check_return_eligibility

2. For each tool, verify every error return contains:
   □ isError: true
   □ errorCategory: one of transient/validation/permission/business
   □ isRetryable: correct value for the category
   □ description: non-empty string with context

3. Verify each tool covers all applicable error types:
   □ Validation error (invalid format)
   □ Business error (not found or rule violation)
   □ Transient error (simulated timeout trigger)

4. Report format:
   PASS: tool_name — all 3 error types present, all 4 fields correct
   WARN: tool_name — missing [error type or field]
   FAIL: tool_name — throws instead of returning structured error

5. Print summary: X/7 tools fully compliant
