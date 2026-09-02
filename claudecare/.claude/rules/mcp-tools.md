---
paths:
  - "src/mcp/tools/*.js"
  - "src/mcp/tools/index.js"
---

# MCP Tool File Standards

## File Structure (required for all tool files)
Every tool file must export exactly two things:
  export const definition = { name, description, input_schema }
  export async function executor(args) { ... }

Never combine definition and executor into one export.
Never define tools inline in agent files.

## Description Quality Check
Before committing any tool file, verify the description contains:
  □ Component 1: What it does (one sentence)
  □ Component 2: What it returns (every field listed)
  □ Component 3: When to use it (explicit triggers)
  □ Component 4: When NOT to use it (alternatives named)
  □ Component 5: Example input (realistic ClaudeCare data)

## Input Schema Requirements
- Every required field must have a description in the schema
- Format constraints must be in the description (e.g., "C-XXXX")
- Optional fields must be marked with their defaults

## After Adding or Modifying a Tool
Run these verification steps in order:
  node src/mcp/tools/test-selection.js    ← must be 6/6
  node src/mcp/tools/test-errors.js       ← must be 5/5
  node src/agents/run-coordinator.js      ← must be 3/3
