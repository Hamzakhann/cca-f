# Tool Design Standards

## The 5-Component Description Rule
Every tool definition must include all 5 components:
1. What it does (one clear sentence)
2. What it returns (list every field with type and possible values)
3. When to use it (explicit trigger conditions)
4. When NOT to use it (name the alternative tools explicitly)
5. Example input (concrete, realistic example)

Missing any component is a defect — not a style preference.

## Structured Error Responses
All executor errors must return:
{
  isError: true,
  errorCategory: "transient" | "validation" | "permission" | "business",
  isRetryable: true | false,
  description: "human-readable explanation with context"
}

Never throw. Never return undefined. Never return a raw Error object.

## Error Category Rules
- transient: isRetryable: true (timeout, service unavailable)
- validation: isRetryable: true (fix input and retry)
- permission: isRetryable: false (authority won't change on retry)
- business: isRetryable: false (policy won't change on retry)

## Tool Scoping Per Agent
- billingAgent tools: get_customer, get_invoice,
  check_payment_history, process_refund, escalate_to_human
- returnsAgent tools: get_customer, lookup_order,
  check_return_eligibility, escalate_to_human
- technicalSupportAgent tools: get_customer, check_api_status,
  get_error_logs, escalate_to_human
- coordinator tools: none (routes only — no business logic tools)
- Never give an agent tools outside its specialisation

## Adding New Tools
1. Create src/mcp/tools/{tool_name}.js
2. Write definition with all 5 components
3. Write executor with all 4 error categories covered
4. Add to src/mcp/tools/index.js
5. Add to the relevant agent's allowed tool list
6. Run test-selection.js — verify 6/6 still passes
