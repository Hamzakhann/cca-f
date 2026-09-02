---
context: fork
allowed-tools:
  - Read
  - Grep
  - Glob
argument-hint: "Which area? Enter: tools / agents / hooks / all"
---

# Analyze Coverage Skill

Analyses test coverage for a specified area of ClaudeCare.
Runs in an isolated fork to prevent file content from
polluting the main session context.

## Execution Steps

### If argument is "tools":
1. Glob: find all files matching src/mcp/tools/*.js
   (exclude test-*.js files)
2. For each source file found:
   a. Check if a corresponding test-{name}.js exists
   b. If exists: Read the test file, verify it covers
      happy path + validation + business + transient errors
   c. If missing: mark as NO COVERAGE
3. Grep: search src/mcp/tools/ for "PREDICT:" comments
   Count files that include Stage 2 prediction documentation

### If argument is "agents":
1. Glob: find src/agents/*.js (exclude run-*.js test runners)
2. For each agent: Read and check for inline tool definitions
   (should be zero — all tools come from registry)
3. Grep: search for any hardcoded PKR amounts or customer IDs
   inside agent logic (should be zero — data comes from tools)

### If argument is "hooks":
1. Glob: find src/hooks/*.js (exclude test-*.js)
2. For each hook: Read and verify:
   - PreToolCall hooks return { blocked: boolean }
   - PostToolUse hooks return JSON string (not object)
   - Hooks check toolName before transforming (selectivity)
3. Grep: find any tool name strings in hook files
   Verify they match actual tool names in the registry

### If argument is "all":
Run all three sections above in sequence.

## Output Format (returned to main session)

Return ONLY this summary — no intermediate file content:

## Coverage Report: {area}

### Tools Coverage
| Tool | Test File | Happy | Validation | Business | Transient |
|---|---|---|---|---|---|
| get_customer | ✅ exists | ✅ | ✅ | ✅ | ✅ |
| lookup_order | ✅ exists | ✅ | ✅ | ✅ | ✅ |
...

Gaps: [list any missing coverage]

### Agents Health
- Inline tool definitions: 0 ✅
- Hardcoded data: [list any found]

### Hooks Compliance
- refundGuard: returns { blocked: boolean } ✅
- normalizer: returns JSON string ✅
- Selectivity: [list any hooks missing toolName check]

Summary: X/7 tools fully covered, Y gaps identified
