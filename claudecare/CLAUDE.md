# ClaudeCare — AI Customer Support Platform

## Project Overview
ClaudeCare is an agentic customer support system built on the
Anthropic Claude API. It resolves billing disputes and product
returns autonomously, escalating to human agents when required.

## Architecture
- **Loop engine**: src/agent/loop.js — core agentic loop,
  stop_reason controls all termination
- **Agents**: src/agents/ — coordinator routes to billing and
  returns specialists via hub-and-spoke pattern
- **Hooks**: src/hooks/ — PreToolCall (refundGuard) and
  PostToolUse (normalizer) enforce business rules deterministically
- **Tools**: src/mcp/tools/ — 7 MCP tools, all with 5-component
  descriptions and structured error responses
- **Resources**: src/mcp/resources.js — policy catalog
  (refund limits, return window, escalation triggers)

## Universal Rules (apply to every file, every session)
- All monetary amounts: PKR X,XXX.XX format — never USD, never $
- stop_reason is the only valid loop termination signal — never
  parse Claude's text output for completion signals
- All errors must be structured: { isError, errorCategory,
  isRetryable, description } — never throw raw exceptions
- Business rules > PKR 50,000 are enforced by hooks, not prompts
- Never commit credentials — use ${ENV_VAR} expansion always

## Imported Standards
@import .claude/standards/api-conventions.md
@import .claude/standards/tool-design.md

## Key Files
- src/agent/loop.js — read this before touching any agent
- src/mcp/tools/index.js — the tool registry, all 7 tools
- src/hooks/index.js — hook pipeline entry point
- src/mcp/resources.js — policy catalog
- .mcp.json — MCP server configuration (committed, uses ${VAR})

## CI Review Context
When running as a CI reviewer (invoked with -p flag):
- Read src/prompts/review-criteria.md before reviewing any file
- Output must conform to schemas/review-schema.json
- Review only files changed in the current PR (use git diff)
- Do not report issues in files not changed by this PR
- Include prior-review-findings.json in context if it exists
  and report only NEW or STILL-UNADDRESSED issues
- Session is independent — do not assume knowledge of
  implementation intent. Review the code as written.
