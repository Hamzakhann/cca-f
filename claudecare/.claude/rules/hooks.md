---
paths:
  - "src/hooks/*.js"
---

# Hook Development Standards

## Hook Types and When to Use Each
- PreToolCall: enforcement BEFORE tool executes
  → use for: business rule violations, compliance checks,
    authority verification, redirect logic
- PostToolUse: transformation AFTER tool executes
  → use for: data normalisation, format standardisation,
    field enrichment, sensitive data scrubbing

## The Determinism Rule
If a business rule must NEVER fail — enforce it in a hook,
not a system prompt. Prompts are probabilistic. Hooks are code.

Current enforced rules (do not weaken without explicit decision):
  - Refunds > PKR 50,000: blocked by refundGuard PreToolCall
  - Timestamps: normalised by normalizer PostToolUse
  - Status codes: normalised by normalizer PostToolUse

## Hook Return Requirements
- PreToolCall must always return: { blocked: boolean }
  If blocked: true, must include redirectTo and message
  If blocked: false, must return exactly { blocked: false }
- PostToolUse must always return a JSON string
  Never return undefined. Never return an object.

## Selectivity Rule
Hooks must check toolName before transforming.
A hook designed for get_invoice must not transform lookup_order.
Use explicit tool name checks — never transform blindly.

## Boundary Tests (run after any refundGuard change)
PKR 49,999 → ALLOWED
PKR 50,000 → ALLOWED  (strictly greater than, not >=)
PKR 50,001 → BLOCKED → escalate_to_human
