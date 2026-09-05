# Role 3 — MCP Tool Builder
## Claude Certified Architect Foundations (CCA-F)

---

## What Is Role 3?

Role 3 is the **infrastructure layer** of the Claude ecosystem.

A Role 3 engineer builds the tools, resources, and server configurations that Claude agents use to interact with the real world. Without Role 3, agents are intelligent but powerless — they can reason, but they have nothing to act on. Role 3 is what gives Claude hands.

If Role 1 (Agent Builder) is the brain and Role 2 (Claude Code Configurator) is the developer workflow — Role 3 is the nervous system that connects the brain to everything else.

---

## What Does a Role 3 Engineer Actually Do?

A Role 3 engineer is responsible for three things:

**1. Designing and building MCP tools**
Tools are the functions Claude calls to retrieve data or take actions. A Role 3 engineer writes the tool definitions (what Claude reads to decide which tool to call) and the tool executors (what actually runs when Claude calls the tool). Every tool that touches a database, an API, or a business system goes through Role 3.

**2. Configuring the MCP server infrastructure**
Role 3 engineers define how tools are registered, how the MCP server starts, how credentials are managed securely, and how tools are made available to Claude Code, Claude Desktop, and custom agents.

**3. Designing the resource catalog**
Not everything Claude needs should be a tool. Stable reference data — business policies, configuration values, SLA targets — belongs in MCP resources. Role 3 engineers decide what is a tool (live data) and what is a resource (stable data) and build accordingly.

---

## The Three Consumers of Role 3 Work

Role 3 tools and resources are consumed by three different clients:

```
Custom Agents (Role 1)
  Agent code imports tool definitions and executors directly.
  Tools are called inside the agentic loop.
  No .mcp.json needed — direct import from the registry.

Claude Code CLI (Role 2)
  Reads .mcp.json to discover and connect to the MCP server.
  Tools available to developers in their Claude Code sessions.
  Restart required when new tools are added.

Claude Desktop / Claude Apps
  Reads .mcp.json or ~/.claude.json to connect to MCP server.
  Tools available to non-technical users through the UI.
  No code required from the end user.
```

The tools themselves do not change based on who consumes them. Role 3 builds once. All three clients benefit.

---

## Role 3 Responsibilities

### Tool Design
- Write tool descriptions with all 5 required components
- Ensure tool names carry domain signal before descriptions are read
- Define clear negative boundaries so Claude never picks the wrong tool
- Avoid the 6 description anti-patterns that cause misrouting
- Test selection reliability across direct, indirect, and ambiguous queries

### Schema Design
- Mark fields as required, optional, or nullable correctly
- Use nullable for fields that may not exist in the source
- Never mark absent information as required — it causes fabrication
- Use enum types to constrain possible values explicitly

### Error Response Design
- Return structured errors — never throw raw exceptions
- Apply the correct error category for every failure type:
  - `transient` — temporary, retry may succeed
  - `validation` — bad input, fix and retry
  - `permission` — no authority, do not retry
  - `business` — policy violation, do not retry
- Always include `isError`, `errorCategory`, `isRetryable`, `description`
- Never return empty results when the data source was unreachable

### Server Configuration
- Put team-shared config in `.mcp.json` (committed to VCS)
- Put personal config in `~/.claude.json` (never committed)
- Use `${ENV_VAR}` expansion for all credentials in `.mcp.json`
- Keep real values in `.env` (gitignored)
- Rotate any secret accidentally committed — git history is permanent

### Resource Design
- Expose stable reference data as MCP resources, not tools
- Reserve tools for live, request-specific data
- Resources load once at session start — zero tokens per access
- Use clear URI schemes: `service://category/resource-name`

### Tool Scoping
- Maintain one central tool registry
- Filter per agent — each agent gets only what it needs
- Maximum ~5 tools per agent for reliable selection
- Cross-cutting tools (identity, escalation) may appear in multiple agents
- The coordinator has zero business-logic tools

---

## What Role 3 Does NOT Do

Role 3 is not responsible for:

- **Agentic loop logic** — how the loop runs, when it exits, how tool results flow back into context. That is Role 1.
- **Multi-agent orchestration** — coordinators, subagents, parallel execution. That is Role 1.
- **CLAUDE.md configuration** — project standards, path-scoped rules, slash commands. That is Role 2.
- **CI/CD pipelines** — automated review workflows, the `-p` flag, structured CI output. That is Role 2.
- **Prompt engineering** — review criteria, few-shot examples, validation-retry loops. That is Role 1/2.

Role 3 builds the interface. Other roles use it.

---

## The Mental Model

Think of Role 3 as building an API for Claude.

A backend engineer builds a REST API so frontend applications can retrieve and modify data. The frontend does not care how the database is structured. It calls an endpoint and gets a response.

Role 3 builds an MCP API so Claude agents and Claude clients can retrieve and modify data. Claude does not care how the database is structured. It calls a tool and gets a response.

The difference: instead of HTTP verbs and status codes, Role 3 uses tool descriptions and structured error responses. Instead of API documentation, Role 3 writes tool descriptions that Claude reads directly to make selection decisions.

**The quality of Role 3 work directly determines the quality of everything built on top of it.**

A poorly described tool means agents misroute. A fabricated value from a bad schema means wrong data enters the system silently. A raw throw instead of a structured error means the agent cannot recover. An access failure masked as an empty result means a customer is wrongly denied a refund.

Role 3 is not glamorous. It is the foundation. Everything depends on it being right.

---

## The 12 Concepts Role 3 Engineers Must Master

### Day A — Tool Design Layer

| # | Concept | Why It Matters |
|---|---------|---------------|
| 1 | Tool description — 5-component structure | Claude reads descriptions, not code. Bad descriptions = misrouting. |
| 2 | Tool naming — split vs consolidate | Names carry signal before descriptions are read. |
| 3 | Description anti-patterns — 6 failure modes | Each failure causes a different production problem. |
| 4 | Input schemas — required vs optional vs nullable | Nullable prevents fabrication on absent data. |
| 5 | Tool selection reliability | Consistency across runs matters more than average accuracy. |
| 6 | Structured error responses — 4 categories | Errors tell Claude what to do next. Raw throws break the loop. |
| 7 | Access failure vs valid empty result | Silent failures cause wrong financial conclusions. |

### Day B — Configuration & Architecture Layer

| # | Concept | Why It Matters |
|---|---------|---------------|
| 8 | MCP server config — .mcp.json vs ~/.claude.json | Team config vs personal config. Wrong file breaks the whole team. |
| 9 | Environment variable expansion — ${VAR} | Secrets never touch git. Accidental commits require key rotation. |
| 10 | Tool discovery at connection time | New tool added mid-session is invisible. Restart required. |
| 11 | MCP resources — policy catalogs | Stable data costs zero tokens. Tools for live data only. |
| 12 | Tool scoping — right tools per agent | 5-tool rule. One registry, filtered per role. |

---

## The Role 3 Decision Framework

When designing any new tool, answer these questions in order:

```
1. Should this be a tool or a resource?
   Changes per request → tool
   Stable reference data → resource

2. What is the tool's exact name?
   Format: {verb}_{domain}
   get_, lookup_, check_ = read-only
   process_, create_, escalate_ = writes state
   Split if different inputs, outputs, or domains

3. Does the description have all 5 components?
   What it does / what it returns / when to use /
   when NOT to use / example input

4. Is every schema field typed correctly?
   Required = tool cannot run without it
   Optional = improves result, absence is fine
   Nullable required = must answer, null is honest

5. Does the executor handle all 4 error categories?
   transient / validation / permission / business
   Never throw. Never return empty on access failure.

6. Which agents need this tool?
   Add to their filtered scope only.
   Does not go into the coordinator.
```

---

## Role 3 in the Context of ClaudeCare

ClaudeCare's Role 3 layer consists of:

```
src/mcp/
├── tools/
│   ├── get_customer.js              ← account profile lookup
│   ├── lookup_order.js              ← order record retrieval
│   ├── check_payment_history.js     ← transaction history
│   ├── check_return_eligibility.js  ← 30-day return window check
│   ├── process_refund.js            ← automated refund execution
│   ├── escalate_to_human.js         ← human escalation ticket
│   ├── get_invoice.js               ← invoice record retrieval
│   ├── check_api_status.js          ← API integration health
│   ├── get_error_logs.js            ← API error log retrieval
│   └── index.js                     ← central registry
├── resources.js                     ← policy catalog (4 resources)
└── server.js                        ← MCP server entry point

.mcp.json                            ← project-level server config
.env                                 ← real credentials (gitignored)
```

Every tool has:
- A 5-component description
- A typed input schema with nullable fields where appropriate
- All 4 error categories implemented in the executor
- A correct distinction between access failures and valid empty results

Every resource covers stable policy data:
- `claudecare://policies/refund-limits`
- `claudecare://policies/return-window`
- `claudecare://policies/escalation-triggers`
- `claudecare://policies/customer-tiers`

---

## The One Thing to Remember About Role 3

> Claude cannot see your code. It can only read your descriptions, schemas, and error messages. The quality of those words is the quality of your tools. Write them for Claude, not for developers.

---

*Part of the Claude Certified Architect Foundations (CCA-F) study system.*
*Built through the ClaudeCare project — a production-grade AI customer support platform.*