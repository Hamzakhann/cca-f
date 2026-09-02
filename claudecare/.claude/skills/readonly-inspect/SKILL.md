---
context: fork
allowed-tools:
  - Read
  - Grep
argument-hint: "File path to inspect (e.g. src/mcp/tools/get_customer.js)"
---

# Readonly Inspect Skill

Inspects a single ClaudeCare source file and produces a
structured report. Cannot modify any files — Read and Grep only.

## Steps
1. Read the specified file completely
2. Identify the file type:
   - Tool file: check 5-component description, error structure
   - Agent file: check tool imports, hook wiring, system prompt
   - Hook file: check return types, selectivity, toolName checks
3. Grep for any TODO or FIXME comments in the file
4. Report:
   - File type identified
   - Compliance with relevant standards
   - Any TODO/FIXME items found
   - Specific improvement recommendations

## What This Skill Cannot Do
This skill has allowed-tools: [Read, Grep] only.
It cannot Write, Edit, or run Bash commands.
It inspects and reports — it does not modify.
