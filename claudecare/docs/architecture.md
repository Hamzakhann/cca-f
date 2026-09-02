# ClaudeCare — Architecture Documentation
## Built across 15 days as preparation for Claude Certified Architect – Foundations

---

## System Overview

ClaudeCare is an AI-powered customer support platform that resolves
billing disputes, product returns, and technical integration issues
autonomously — escalating to human agents only when structural criteria
are met.

**Entry point:** `node src/index.js`  
**Domains covered:** All 5 exam domains across 29 source files

---

## Domain 1: Agentic Architecture & Orchestration

### Agentic Loop (src/agent/loop.js)
The core loop uses `stop_reason` as the ONLY loop termination signal.
`stop_reason === 'end_turn'` exits. `stop_reason === 'tool_use'`
executes tools and continues. Text content is never parsed for
completion signals.

### Hub-and-Spoke Multi-Agent (src/agents/coordinator.js)
The coordinator owns: triage, context packaging, parallel dispatch,
result aggregation, synthesis. It has zero business-logic tools.
Subagents receive only domain-specific context — never the full
coordinator conversation history.

### Parallel Execution
`Promise.all([billingAgent, returnsAgent, technicalAgent])`
with `.catch()` wrappers on each. One agent failure produces
partial results — never a full coordinator crash.

### Hooks (src/hooks/)
- `refundGuard.js` — PreToolCall hook: intercepts `process_refund`
  calls with amount > PKR 50,000. Deterministic enforcement —
  cannot be bypassed by prompt instruction.
- `normalizer.js` — PostToolUse hook: converts Unix timestamps to
  ISO 8601 and numeric status codes to readable strings before
  Claude processes tool results.

**Why hooks over prompts:** Hooks are code. They run unconditionally.
Prompt instructions are probabilistic — they can fail under unusual
inputs. For financial compliance rules, determinism is mandatory.

---

## Domain 2: Tool Design & MCP Integration

### Tool Registry (src/mcp/tools/index.js)
9 tools total. Each tool file exports `definition` (what Claude reads)
and `executor` (what runs). Every definition has all 5 components:
what it does, what it returns, when to use it, when NOT to use it
(explicit alternatives named), and an example input.

### Tool Scoping Per Agent
- **billingAgent:** `get_customer`, `get_invoice`, `check_payment_history`, `process_refund`, `escalate_to_human` (5 tools)
- **returnsAgent:** `get_customer`, `lookup_order`, `check_return_eligibility`, `escalate_to_human` (4 tools)
- **technicalAgent:** `get_customer`, `check_api_status`, `get_error_logs`, `escalate_to_human` (4 tools)
- **coordinator:** zero business tools — routing only

Reason: tool selection reliability degrades significantly above
~5 tools per agent. Each agent has only the tools its role requires.

### Structured Error Responses
All 9 tools return structured errors: `{ isError: true, errorCategory, isRetryable, description }`. Never throw. Never return undefined.
errorCategory determines retry strategy:
- `transient` → `isRetryable: true` (retry may succeed)
- `validation` → `isRetryable: true` (fix input and retry)
- `permission` → `isRetryable: false` (authority won't change)
- `business` → `isRetryable: false` (policy won't change)

### MCP Configuration (.mcp.json)
Project-level (committed to VCS). Team-shared. Uses `${ENV_VAR}`
expansion for credentials — never literal tokens. User-level
personal config goes in `~/.claude.json` — never committed.

### MCP Resources (src/mcp/resources.js)
Policy catalog exposed as resources:
- `cloudcare://policies/refund-limits`
- `cloudcare://policies/return-window`
- `cloudcare://policies/escalation-triggers`
- `cloudcare://policies/customer-tiers`

Reduces exploratory tool calls for policy lookups.

---

## Domain 3: Claude Code Configuration & Workflows

### CLAUDE.md Hierarchy
- `~/.claude/CLAUDE.md` → personal only, never committed
- `CLAUDE.md` (root) → project-level, committed, all developers
- `.claude/standards/` → `@imported` topic-specific standards
- `.claude/rules/` → path-scoped with YAML frontmatter:
  - `testing.md`: `paths: ["**/*.test.js", "**/test-*.js"]`
  - `mcp-tools.md`: `paths: ["src/mcp/tools/*.js"]`
  - `hooks.md`: `paths: ["src/hooks/*.js"]`

### Path-Scoped Rules
Rules load ONLY when editing matching files. A developer editing
`get_customer.js` gets MCP tool standards. The same developer editing
`test-get_customer.js` gets BOTH MCP standards and testing standards.
Irrelevant rules never load — context stays focused.

### Slash Commands (.claude/commands/)
- `/review-tool` — reviews MCP tool description quality
- `/check-hooks` — audits hook coverage
- `/agent-status` — shows coordinator routing and tool scoping
- `/generate-test` — generates tests against testing standards
- `/audit-errors` — audits all 9 tools for error structure compliance

### Skills (.claude/skills/)
- `analyze-coverage`: `context: fork`, `allowed-tools: [Read, Grep, Glob]`
- `readonly-inspect`: `context: fork`, `allowed-tools: [Read, Grep]`

`context: fork` prevents verbose skill output from polluting the
main session context. Measured: 17,400 tokens stay in the fork.
Main session receives ~500 tokens of clean summary.

### CI/CD Pipeline (.github/workflows/claude-review.yml)
`claude -p --output-format json --json-schema "$(cat schema.json)"`
- `-p` flag: non-interactive mode (prevents CI hang)
- `--output-format json`: machine-parseable findings
- `--json-schema`: guarantees schema compliance
Separate session for review — never the author's session.
Prior findings injected on re-run — prevents duplicate comments.

---

## Domain 4: Prompt Engineering & Structured Output

### Review Criteria (src/prompts/review-criteria.md)
Explicit categorical criteria — never vague instructions.
Each criterion has DO/DO NOT examples. Three few-shot examples
for ambiguous cases showing WHY decisions are made.
False positive audit: 0% after adding negative boundary examples.
"Be conservative" is not a criterion — it doesn't change the
decision procedure. Specific examples do.

### Issue Extractor (src/extraction/issueExtractor.js)
`tool_use` with forced `tool_choice: { type: "tool", name: "extract_support_issue" }`
JSON schema with nullable fields for absent information.
3 few-shot examples in system prompt for ambiguous cases.
Confidence score per extraction for human review routing.

### Validation-Retry Loop (src/extraction/validator.js)
On validation failure: append SPECIFIC errors, not "please retry."
Maximum 3 attempts. After 3: `needsHuman: true`.
Business logic validation catches semantic errors schema cannot:
`invoice_id` present → `issue_type` should be `"billing"`
`action_required` `"return"` → `order_id` must be present

### Message Batches API (src/batch/)
End-of-day ticket categorisation: latency-tolerant, no user waiting.
50% cost savings, up to 24-hour window, `custom_id` per ticket.
Prompt-based JSON extraction (not `tool_use`) — Batches API cannot
do multi-turn tool calling.
Synchronous API for PR review (blocking workflow).

### 2-Pass Review (src/review/multiPassReview.js)
- Pass 1: per-file, full attention, local issues only
- Pass 2: cross-file integration using Pass 1 summaries only

Empirically: 8 findings (single-pass) vs 24 findings (2-pass).
Pass 2 found 4 integration bugs invisible to per-file review.

---

## Domain 5: Context Management & Reliability

### Case Facts Extractor (src/context/caseFactsExtractor.js)
Extracts transactional facts (PKR amounts, payment IDs, dates,
order IDs) into a persistent block injected at the START of
every synthesis prompt. Survives progressive summarisation.
`## CASE FACTS (DO NOT SUMMARISE)` annotation ensures models
treat this block as authoritative.

### Scratchpad (src/context/scratchpad.js)
State persisted to `.claude/scratchpad-{customerId}.json`.
Enables session resumption after context window exhaustion.
Coordinator reads scratchpad at start if prior session exists.
Resolved issues logged. Pending issues tracked.

### Escalation Engine (src/escalation/escalationEngine.js)
Three valid triggers ONLY:
1. `customer_demand` — explicit "I want a human" language (including supervisor, manager)
2. `policy_gap` — request not covered by any policy rule
3. `max_attempts` — 3 consecutive resolution failures

Angry tone: NOT a trigger. Confidence score: NOT a trigger.
Empirically tested: 6/6 correct decisions including sentiment rejection.

### Human Review Queue (src/review/humanQueue.js)
Field-level routing: low confidence on `action_required` routes to
review regardless of overall confidence.
Conflicting signals (`escalation_requested` true but `action` != escalate)
route to review.
Calibrated threshold: 0.75 overall, 0.80 for critical fields.

### Accuracy Tracker (src/review/accuracyTracker.js)
Tracks accuracy PER issue_type AND PER field.
Never reports aggregate only. `automation_safe: false` until ALL
categories and ALL fields exceed threshold.
Aggregate 97% can mask 60% accuracy in specific category.

### Stratified Sampler (src/review/stratifiedSampler.js)
Samples proportionally per stratum (`issue_type`).
Minimum 10 per stratum before reporting accuracy.
Prevents rare-category failures hiding in aggregate numbers.

### Provenance Tracker (src/provenance/provenanceTracker.js)
Every coordinator claim maps to: source tool, tool call ID,
`queried_at` timestamp.
Conflicting sources annotated — never silently resolved.
Temporal differences handled via `queried_at` comparison.
Synthesis prompt includes `## VERIFIED CLAIMS` section.

---

## Key Anti-Patterns Avoided

1. Loop termination on text content → use `stop_reason` always
2. Prompt-based enforcement for financial rules → use hooks
3. Sentiment-based escalation → use structural criteria only
4. Aggregate accuracy reporting → track per-category per-field
5. Arbitrary confidence thresholds → calibrate from labeled data
6. Inline tool definitions in agent files → use registry only
7. Same session for code generation and review → separate sessions
8. Verbose tool outputs accumulating in context → trim to relevant fields
9. Single-pass review of multi-file systems → 2-pass architecture
10. Committing secrets in `.mcp.json` → `${ENV_VAR}` expansion always

---

## Exam Coverage Map

- **Domain 1 (27%):** `loop.js`, `coordinator.js`, `*Agent.js`, `hooks/`
- **Domain 2 (18%):** `mcp/tools/`, `.mcp.json`, `mcp/resources.js`
- **Domain 3 (20%):** `CLAUDE.md`, `.claude/`, `.github/workflows/`
- **Domain 4 (20%):** `prompts/`, `extraction/`, `batch/`, `review/multiPassReview.js`
- **Domain 5 (15%):** `context/`, `escalation/`, `review/`, `provenance/`

All 5 domains exercised in a single run of: `node src/index.js`
