# ClaudeCare CI Review Criteria

## What to REPORT

### Category: error-structure (severity: high)
Flag any tool executor that throws instead of returning a
structured error object.

REPORT this:
  throw new Error('Customer not found')
  throw new Error(`Timeout: ${customerId}`)
  return null
  return undefined

DO NOT report this:
  return { isError: true, errorCategory: 'business',
           isRetryable: false, description: 'Customer not found' }

### Category: currency-format (severity: high)
Flag any monetary amount returned without an explicit
currency: "PKR" field.

REPORT this:
  return { amount: 12500 }
  return { refund_amount: 75000, status: 'processed' }

DO NOT report this:
  return { amount: 12500, currency: "PKR" }
  console.log(`RefundGuard: PKR ${amount} — BLOCKED`)
  message: `Automated refund blocked: PKR ${amount} exceeds limit`
  // Do NOT report console.log statements, log strings, or message text containing inline PKR.
  // ONLY report structured tool return JSON objects that contain numeric amount fields missing currency: "PKR".

### Category: loop-termination (severity: high)
Flag any agentic loop that terminates on text content
instead of stop_reason.

REPORT this:
  if (response.content[0].text.includes('done')) break
  if (iterations >= 10) break  // as PRIMARY stop condition
  while (response.content.some(b => b.type !== 'tool_use'))

DO NOT report this:
  if (response.stop_reason === 'end_turn') break

### Category: tool-description (severity: medium)
Flag any tool definition missing one or more of the
5 required description components.

Check for:
  □ What it does (one sentence)
  □ What it returns (field list)
  □ When to use it
  □ When NOT to use it (alternatives named)
  □ Example input

### Category: hook-enforcement (severity: medium)
Flag any business rule enforced only by a prompt instruction
that should be enforced by a PreToolCall hook.

REPORT this:
  system: "Never process refunds above PKR 50,000"
  // with no corresponding hook in src/hooks/

DO NOT report this:
  // refundGuard.js PreToolCall hook exists and enforces this

### Category: test-coverage (severity: low)
Flag any tool test file missing:
  - PREDICT comment before each test assertion
  - Transient error test (C-0000 / INV-0000 / ORD-0000 trigger)
  - Validation error test (invalid format input)

## What NOT to Report
- Variable naming conventions (camelCase vs snake_case)
- Comment verbosity or style
- Import ordering
- Whitespace or formatting
- File organisation preferences
- Console.log statements in test files

## Severity Rules
high:   bugs that would cause incorrect behaviour in production
medium: ClaudeCare standards violations that degrade system quality
low:    missing documentation or test coverage gaps

## False Positive Prevention
If you are uncertain whether something violates a standard —
do NOT report it. Only report findings you can point to a
specific standard violation in CLAUDE.md or this file.
A false positive in the error-structure category is worse than
a missed finding — it trains developers to ignore the reviewer.

## Few-Shot Examples for Ambiguous Cases

### Example 1: Raw throw in a catch block — REPORT

Code:
  async function executor({ customer_id }) {
    try {
      const result = await db.query(customer_id)
      return result
    } catch (err) {
      throw err   // ← re-throws raw error
    }
  }

Reasoning: The catch block re-throws the raw error instead of
returning a structured error object. When loop.js executes this
tool and the catch fires, the loop's own try/catch receives a
raw Error — not { isError: true, errorCategory, isRetryable }.
The loop cannot make an intelligent retry decision. The agentic
loop crashes or behaves unpredictably.

Output:
{
  "file": "src/mcp/tools/example.js",
  "line": 6,
  "severity": "high",
  "category": "error-structure",
  "description": "catch block re-throws raw Error instead of returning
    structured error object. Loop cannot determine errorCategory or
    isRetryable — cannot recover gracefully.",
  "suggestion": "Return { isError: true, errorCategory: 'transient',
    isRetryable: true, description: err.message } instead of throw err"
}

### Example 2: Vague comment that isn't contradictory — DO NOT REPORT

Code:
  // Handles edge cases for PKR formatting
  function formatAmount(amount) {
    return `PKR ${amount.toLocaleString('en-PK', {
      minimumFractionDigits: 2
    })}`
  }

Reasoning: The comment says "handles edge cases" — vague, but not
contradictory. The function does handle formatting. The comment
doesn't claim specific behaviour that the code violates. This
is imprecise documentation, not a standards violation.

Output: No finding — do not report imprecise comments that
are not actively contradictory.

### Example 3: Missing currency field — ambiguous context — REPORT

Code:
  return {
    success: true,
    refund_id: "REF-001",
    amount: 12500,
    estimated_days: 5
  }

Reasoning: The amount field (12500) has no currency field. Even
though the return is from process_refund.js (context implies PKR),
the schema test confirms currency: "PKR" must be explicit in all
monetary return objects. A caller cannot assume currency from
context — it must be stated. This is a standards violation even
though the intent is clear.

Output:
{
  "severity": "medium",
  "category": "currency-format",
  "description": "Return object includes monetary amount (12500) without
    explicit currency: 'PKR' field. All monetary amounts must declare
    currency explicitly per api-conventions.md.",
  "suggestion": "Add currency: 'PKR' to the return object"
}
