---
paths:
  - "**/*.test.js"
  - "**/test-*.js"
---

# ClaudeCare Testing Standards

## Test Structure
- Every test file must include a Stage 2 prediction comment
  showing expected output BEFORE the test code
- Format: // PREDICT: { expected output here }

## Mock Data Requirements
- Use canonical ClaudeCare IDs: C-1001, C-1002, C-1003
- Use canonical invoice IDs: INV-1001, INV-2002, INV-3003
- Use canonical order IDs: ORD-5001, ORD-5002, ORD-5003
- Never invent new IDs in tests — use the established set

## What Every Tool Test Must Cover
- Happy path: valid input, expected output
- Validation error: invalid format input
- Business error: valid format but unknown ID
- Transient error: use the C-0000 / INV-0000 / ORD-0000 trigger

## Monetary Amounts in Tests
- Always PKR, never USD
- Always include currency: "PKR" in expected return objects
- Test boundary conditions explicitly:
  PKR 49,999 / PKR 50,000 / PKR 50,001 for refund guard tests

## Test File Naming
- Pattern: test-{toolname}.js
- Located in same directory as the file being tested
- Never put all tests in a single root test file
