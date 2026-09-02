# /generate-test

Generates a test file for a named ClaudeCare tool or module,
following the testing standards in .claude/rules/testing.md.

Usage: /generate-test [tool-name]
Example: /generate-test get_invoice

Steps:
1. Read src/mcp/tools/{tool-name}.js — understand the tool's
   definition, executor logic, and error cases
2. Read the existing test file if one exists:
   src/mcp/tools/test-{tool-name}.js
   If it exists: identify gaps in coverage, do not duplicate
   existing tests
3. Generate tests covering:
   □ Happy path: all mock data entries (C-1001, C-1002, C-1003)
   □ Validation error: invalid format input
   □ Business error: unknown ID (C-9999 / INV-9999 / ORD-9999)
   □ Transient error: the C-0000 / INV-0000 / ORD-0000 trigger
   □ Boundary condition: PKR 50,000 if tool involves amounts
4. Each test must include a PREDICT comment before the assertion
5. Write to src/mcp/tools/test-{tool-name}.js
   (or append if file exists and gaps were identified)
6. Report: how many tests added, which cases covered

Standards that apply:
  - Monetary amounts: always PKR X,XXX.XX
  - currency: "PKR" in all expected return objects
  - Use canonical IDs from .claude/rules/testing.md
