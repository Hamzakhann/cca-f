## Day 1: Agentic Loop & Build Discipline

- **4-Step Agentic Loop:** `SEND` (messages array) → `INSPECT` (`response.stop_reason`) → `EXECUTE` (run requested tool) → `APPEND` (push assistant message, then tool result) → repeat until `end_turn`.
- **Primary Loop Failure Modes:**
  1. Terminating on string tokens (e.g., `"COMPLETE"`) instead of checking `response.stop_reason === 'end_turn'`.
  2. Relying on iteration caps as the primary exit condition instead of a safety fallback.
  3. Appending tool results directly without first pushing the assistant's `tool_use` message.
- **4-Stage Build Loop (Mandatory Order):**
  1. *Spec:* 2–5 sentences defining inputs, outputs, actions, and error behavior (no code).
  2. *Predict (Test Oracle):* Calculate exact expected outputs by hand on a mock input to prevent "vibe checking."
  3. *Run:* Execute code against mock input; do not proceed until output matches prediction exactly.
  4. *Make Permanent:* Commit verified code to Git as proof of completion.

---

## Day 2: Multi-Agent Architecture & Coordination

- **Single-Agent Ceilings:** Solved by subagent isolation to prevent tool overload (degradation at 15+ tools), context contamination (polluted conversation history), and latency bottlenecks (lack of parallel execution).
- **Hub-and-Spoke Separation:** The coordinator exclusively handles routing, explicit context packaging, and final synthesis; it holds zero domain tools and executes no business logic.
- **Blank Slate Rule:** Subagents do not inherit conversation history; the coordinator must explicitly inject IDs, relevant records, and specific task instructions into every subagent prompt.
- **Execution Strategy:** Run subagents sequentially when data dependencies exist; run them in parallel (e.g., `Promise.all`) when tasks are independent.
- **Coordination Failure Modes:** Vague subagent task prompts (missing context), coordinator executing business tools directly (scope creep), and omitting subagent outputs in the final coordinator synthesis step (causes hallucination).

---

# Day 3: Hooks & Session Management

- **Hooks vs. Prompts (Determinism):** Prompts are probabilistic and can be bypassed; hooks are deterministic code barriers mandatory for compliance, security, and hard business limits.
- **Interception Points:** `PreToolCall` runs *before* execution to inspect, block, or redirect (e.g., PKR 50,000 refund limit); `PostToolUse` runs *after* execution to clean, format, or enrich data before Claude reasons over it.
- **Hook Gotchas:** Always return the transformed output, target only specific tools rather than mutating globally, and provide an actionable fallback/redirect path when blocking.
- **Session Continuity:** `--resume` restores an exact conversation state, but you must explicitly flag modified files to prevent reasoning on stale context.
- **Branching & Fresh Starts:** Use `fork_session` to isolate divergent technical paths; start fresh with an injected summary whenever the codebase or data has shifted substantially.

---

## Day 4: Tool Design & MCP Foundations

- **Descriptions as Selection Signals:** The LLM inspects only tool names, descriptions, and input schemas (not runtime code) to decide execution; vague descriptions lead to 30–50% mis-selection rates on ambiguous queries.
- **5 Mandatory Description Components:**
  1. *Action:* What the tool does in one sentence.
  2. *Return Schema:* Exact fields and data types returned.
  3. *Positive Trigger:* Explicit conditions and query patterns when to use it.
  4. *Negative Boundary:* Explicit exclusions and alternative tool names (e.g., "Do NOT use for X — use tool_y").
  5. *Example Call:* Concrete input object format.
- **Overlap Prevention:** Avoid functionally identical tool names/descriptions (e.g., `analyze_content` vs `analyze_document`); use scoped naming (e.g., `extract_web_results` vs `extract_document_data`) with sharp negative boundaries.
- **Structured MCP Errors (4 Fields):** Always return `{ isError: true, errorCategory, isRetryable, description }` rather than raw stack traces so the agent can execute deterministic recovery strategies.
- **Error Categories & Retry Rules:**
  - `transient` (`isRetryable: true`): Network/DB timeouts; back off and retry.
  - `validation` (`isRetryable: true`): Malformed input params; correct input and retry.
  - `permission` (`isRetryable: false`): Missing authorization; escalate immediately.
  - `business` (`isRetryable: false`): Policy violations (e.g., expired return window); do not retry, explain rule to user.
- **Tool Scoping Limit (18+ Degradation):** Exposing 18+ tools per agent significantly degrades selection reliability; scope tools strictly by subagent domain (e.g., 4–5 specialized tools per agent) and share only universal primitives (e.g., `get_customer`).



---

## Day 5: MCP Server Configuration & Built-in Tools

- **Configuration Scoping (`.mcp.json` vs. `~/.claude.json`):**
  - Project-level (`.mcp.json`): Committed at repo root so the entire team and CI/CD share server definitions.
  - User-level (`~/.claude.json`): Kept uncommitted in home directory for personal API keys and experimental setups.
  - *Exam Diagnostic:* If tools work locally but fail when a teammate clones the repo, the config was mistakenly placed in `~/.claude.json`.
- **Environment Variable Expansion:** Never commit raw API keys in `.mcp.json`. Use `${VAR_NAME}` syntax (e.g., `"API_TOKEN": "${CLAUDECARE_API_TOKEN}"`) to resolve secrets from runtime/`.env` files without pushing credentials into Git history.
- **Connection-Time Discovery:** MCP tool discovery happens eagerly once at session startup across all configured servers; there is no lazy-loading or need to route tools manually per server.
- **MCP Resources vs. Exploratory Tools:** Expose static knowledge (policies, thresholds, SLA rules) as URI-addressed resources (e.g., `claudecare://policies/refund-limits`) instead of forcing repetitive `get_policy` tool calls that waste tokens and increase round-trip latency.
- **`tool_choice` Guarantees:**
  - `auto`: Model decides between generating conversational text or invoking a tool.
  - `any`: Model *must* invoke at least one tool before responding (guaranteed `tool_use`).
  - `{ type: "tool", name: "tool_name" }`: Forces the model to execute a specific, designated tool first (e.g., forcing `get_customer` verification).
- **Built-in Tool Selection Matrix:**
  - `Grep`: Search file contents using regex/patterns when target files are unknown.
  - `Glob`: Search filenames/paths using glob patterns (e.g., `src/**/*.js`).
  - `Read`: Load full contents of a known file.
  - `Write`: Create a new file or completely overwrite an existing one.
  - `Edit`: Perform surgical in-place modifications using unique anchor text; fallback to `Read` + `Write` if anchors are ambiguous or non-unique.
- **Scoping Failure Anti-Patterns:** Storing configs only in user scope, committing literal tokens instead of `${ENV_VAR}` references, or adding `.mcp.json` to `.gitignore` instead of securing it with environment variables.


---

## Day 6: CLAUDE.md Configuration Hierarchy

- **Reasoning Engine Config (Not Documentation):** `CLAUDE.md` is not a passive human README; it is pre-loaded into the context window at session start to deterministically enforce architecture, coding standards, and project constraints across all developers.
- **Three-Level Hierarchy & Loading Order:**
  1. *User-level (`~/.claude/CLAUDE.md`):* Personal machine preferences; never committed to VCS.
  2. *Project-level (`CLAUDE.md` / `.claude/CLAUDE.md`):* Shared repo standards; committed to Git for universal team alignment.
  3. *Directory-level (`src/agents/CLAUDE.md`):* Scoped overrides/extensions for specific subdirectories.
  - *Loading Stacking:* `User` → `Project` → `Directory` → `Matching Rules`.
- **The User-Level Exam Trap:** If standards work on a senior engineer's local machine but fail completely for new teammates after cloning, the configuration was mistakenly placed in `~/.claude/CLAUDE.md` instead of the repository's root `CLAUDE.md`.
- **Modular Imports (`@import`):** Keep root `CLAUDE.md` lean by linking topic-specific standard files (e.g., `@import .claude/standards/api-conventions.md`) to avoid massive, unmaintainable monolithic files.
- **Path-Scoped Rules (`.claude/rules/*.md`):** Use YAML frontmatter `paths:` (e.g., `paths: ["**/*.test.js"]`) to dynamically load rules *only* when relevant files are being touched, saving tokens and cutting context noise.
- **CLAUDE.md vs. Skills:**
  - `CLAUDE.md`: Universal invariant rules that apply to *every* interaction (e.g., currency format rules, error schemas).
  - `Skills`: On-demand workflows and commands (e.g., `/analyze-coverage`) that run isolated, parameter-driven tasks (often with `context: fork` to prevent polluting the main chat).
- **Execution Modes:**
  - *Plan Mode:* Required for multi-file refactors (3+ files), major migrations, or architectural decisions before writing code.
  - *Direct Execution:* Best for isolated, single-file bug fixes with clear scope and stack traces.
- **Diagnostics & Debugging (`/memory`):** The primary CLI command to inspect loaded memory hierarchy and verify which configuration/rule files are active in the current session.
- **Configuration Pitfalls:** Committing team standards to user home directories, building monolithic 300+ line config files, and omitting `paths:` frontmatter in `.claude/rules/` files.


---


## Day 7: Custom Commands, Skills & Plan Mode

- **Commands vs. Skills:**
  - *Commands (`.claude/commands/`):* Run directly inside the main session context; ideal for lightweight tasks needing access to active conversation history (e.g., `/review-tool`).
  - *Skills (`.claude/skills/`):* Self-contained, multi-step workflows configured via frontmatter; ideal for heavy, parameterized tasks that require isolation (e.g., `/analyze-coverage`).
- **`context: fork` (Sub-agent Isolation):** Spawns an isolated sub-agent to execute heavy discovery work. All intermediate file reads and reasoning tokens evaporate upon completion, returning only a clean summary to the parent session.
- **Context Pollution & Attention Degradation:** Flooding the context window with raw file contents triggers the "lost in the middle" effect, degrading model reasoning on subsequent prompts. `context: fork` maintains high session reasoning quality and keeps token costs minimal.
- **`allowed-tools` (Deterministic Sandboxing):** Hard-limits tool capabilities in skill frontmatter (e.g., `allowed-tools: [Read, Grep, Glob]`) to prevent accidental modifications (like file writes) during read-only discovery tasks.
- **`argument-hint`:** Specifies prompt text in frontmatter to ask users for missing required parameters (e.g., `argument-hint: "Which module? (tools/agents/hooks)"`), preventing accidental full-codebase executions.
- **Project vs. Personal Skills:**
  - `.claude/skills/`: Committed to Git and shared across the entire development team.
  - `~/.claude/skills/`: Local to the developer's machine for personal workflows and verbose debugging variants.
- **Explore Subagent (Plan Mode):** An isolated discovery phase used during plan mode to map codebase architecture and gather facts without exhausting the primary context window before implementation planning.
- **Skill Anti-Patterns & Failure Modes:**
  1. *Unforked Verbose Skills:* Running large codebase audits in the main session without `context: fork`.
  2. *Shared Personal Tweaks:* Committing local debugging variants into the project `.claude/skills/` directory instead of user home scope.
  3. *Unscoped Invocations:* Omitting `argument-hint`, forcing skills to guess parameters or default to expensive, full-codebase execution scopes.


---


## Day 8: Iterative Refinement & CI/CD Integration

- **`-p` / `--print` Flag (CI Essential):** Runs Claude Code non-interactively; prevents automated CI pipelines from hanging indefinitely waiting for user input.
- **Structured CI Output:** Pair `--output-format json` with `--json-schema` to force deterministic JSON output for automated PR bots and linters.
- **Review Session Isolation:** Never allow the same session that generated code to review it; self-review bias masks assumptions and bugs.
- **Interview Pattern:** In unfamiliar/complex architectural tasks, instruct Claude to ask clarifying questions before implementation to eliminate rework.
- **Issue Handling Strategy:**
  - *Independent Bugs:* Fix sequentially one-by-one to maintain clean git diffs.
  - *Interacting Bugs:* Group together in a single prompt to prevent regressions across coupled code.
- **TDD Loop:** Use failing test logs directly as the prompt—executable specs prevent semantic ambiguity.
- **CI Re-run Anti-Pattern:** When re-running PR reviews on new commits, inject prior findings into context to prevent duplicate comments on already-resolved issues.


---


## Day 9 Prompt Engineering, Precision & Structured Output

- **Explicit Boundaries vs. Vague Filters:** Meta-prompts like "be conservative" do not reduce false positives; replace them with strict `REPORT` / `DO NOT REPORT` rules or disable noisy categories to prevent the False Positive Trust Cascade.
- **Example-Based Severity:** Define severity levels (High/Medium/Low) with concrete code snippets rather than abstract prose to ensure deterministic classification across runs.
- **Reasoning in Few-Shot Examples:** Provide 2–4 targeted examples for edge cases, explicitly detailing the rationale behind each classification so the model generalizes correctly.
- **API-Level Schema Enforcement:** Use `tool_use` with forced `tool_choice: { type: "tool", name: "..." }` to eliminate JSON syntax errors and formatting deviations entirely.
- **Nullable Types vs. Hallucinations:** Use `["string", "null"]` for optional extracted data; required string fields without data in the source text force the model to invent dummy values.
- **Syntax vs. Semantic Errors:**
  - *Syntax Errors (Schema-prevented):* Type mismatches, invalid enums, malformed JSON.
  - *Semantic Errors (Code-prevented):* Business logic flaws (e.g., tagging a refund issue as a product return); requires programmatic validation layers.
- **Actionable Validation Retries:** Feed exact, field-level error messages back to the model upon validation failure (capped at 3 retry attempts) before escalating.


---


## Day 10: Batch Processing & Multi-Pass Review

- **Message Batches API (4 Core Properties):**
  - *50% Cost Reduction:* Half the token price of synchronous endpoints for bulk, offline workloads[cite: 1].
  - *Up to 24-Hour Processing Window:* Queued and completed asynchronously within 24 hours (no guaranteed latency SLA)[cite: 1].
  - *`custom_id` Correlation:* Matches individual outputs to original inputs, allowing targeted resubmission of failed items without rerunning the entire batch[cite: 1].
  - *Single-Turn Limitation:* Strictly single-pass; cannot handle multi-turn conversations, live tool-calling loops, or mid-stream execution pauses[cite: 1].
- **Latency & API Decision Matrix:**
  - *Synchronous API:* Use for blocking workflows, live customer disputes, interactive agents, and CI merge gates[cite: 1].
  - *Batches API:* Use for background tasks, end-of-day ticket categorization, bulk report generation, and nightly test suites[cite: 1].
  - *SLA Math:* `Submission Window = SLA Target - 24 Hours` (e.g., a 30-hour SLA requires batch submission within the first 6 hours)[cite: 1].
- **Pre-Batch Validation Rule:** Always validate and refine prompts against 5–10 sample tickets synchronously; a broken prompt in a 500-item batch wastes a full 24-hour cycle and doubles token costs.
- **Architectural Self-Review Bias:** Generating sessions retain reasoning context, intent, and blind spots[cite: 1]. Code reviews must execute in an isolated, fresh Claude session to evaluate code on objective behavior rather than inherited intent[cite: 1].
- **2-Pass Review Architecture:**
  - *Pass 1 (Per-File Local Analysis):* Independent sessions audit single files to catch local bugs (e.g., unhandled errors, schema violations) without "lost-in-the-middle" attention dilution[cite: 1].
  - *Pass 2 (Cross-File Integration Analysis):* Consumes Pass 1 summaries and shared interface contracts to detect cross-module incompatibilities (e.g., coordinator passing `customer_id` while an agent expects `customerId`)[cite: 1].
- **Key Failure Modes:**
  - Routing blocking, latency-sensitive workflows through the 24-hour Batches API[cite: 1].
  - Omitting `custom_id`, forcing full batch resubmissions when only a fraction of items fail[cite: 1].
  - Running single-pass monolithic reviews across 10+ files simultaneously, diluting model attention and missing cross-boundary contract bugs[cite: 1].
- **Empirical Proof: Single-Pass vs. Multi-Pass Code Review**:
  - *Single-Pass Bottleneck (Attention Dilution):* Loading all agent files into a single prompt context (~10k tokens) causes attention dilution. Single-pass review yielded only 8 high-level findings, missing 16 file-local bugs and critical cross-module contract gaps.
  - *Pass 1 (Local Isolation):* Dedicated per-file sessions evaluated single files without context noise, uncovering 16 precise file-local issues (e.g., raw throws, missing try/catch wrappers, unvalidated guard objects, uninspected `stop_reason` terminations).
  - *Pass 2 (Integration Focus):* Consumed Pass 1 summaries with coordinator and tool registry contracts, identifying 8 critical cross-file integration vulnerabilities (e.g., unwired `refundGuard` hooks at coordinator dispatch, `Promise.all` crash cascades from raw-throwing subagents, and `process_refund` tool exposure).
  - *Takeaway:* Multi-pass architecture separates per-file local checks from cross-file interface contract validation, yielding 3x more actionable findings (24 vs 8) with zero attention dilution.



  ---


  ## Day 11: Context Management & Escalation Patterns

- **Case Facts Extraction (Anti-Summarization Loss):** Progressive conversational summarization strips precise numerical values, dates, IDs, and customer SLA expectations[cite: 1]; extract and maintain a dedicated, persistent `caseFacts` block injected across every prompt[cite: 1].
- **Mitigating "Lost in the Middle":** LLMs recall information at the start and end of context windows far better than in the middle[cite: 1]; mitigate attention degradation by placing high-priority findings at the boundaries and using explicit Markdown headers (`##`) as attention anchors[cite: 1].
- **Tool Output Trimming (Context Bloat):** Discard unneeded payload fields immediately via `PostToolUse` hooks or tool executors (e.g., trimming 40-field database responses down to 3–4 required fields) to prevent massive token inflation across multi-turn sessions[cite: 1].
- **Scratchpad State Persistence:** Use structured external storage (e.g., `scratchpad.json`) to persist intermediate state, unresolved tasks, and transactional facts across long multi-turn interactions and process restarts[cite: 1].
- **Structural Escalation vs. Sentiment Anti-Pattern:**
  - *Valid Structural Triggers:* (1) Explicit customer request for a human, (2) Policy gap (uncovered business rule), (3) Inability to progress / exhausted retry attempts[cite: 1].
  - *Sentiment Anti-Pattern:* Never escalate purely because a customer is angry, emotional, or typing in all caps[cite: 1]; if an issue is fully covered by policy and tools, resolve it autonomously[cite: 1].
- **Error Propagation & Partial Results:**
  - Subagents must attempt local recovery for transient issues rather than immediately bubbling errors up[cite: 1].
  - Subagents must return structured error objects instead of throwing raw exceptions to prevent crashing the coordinator's `Promise.all`[cite: 1].
  - The coordinator must synthesize partial successes while flagging failed subagents[cite: 1].
- **Access Failures vs. Valid Empty Results:**
  - *Access Failure (Timeout / 503):* Return `{ isError: true, errorCategory: 'transient', isRetryable: true }`[cite: 1].
  - *Valid Empty Result (No records found):* Return `{ isError: false, data: [] }`[cite: 1].
  - *Gotcha:* Never mask timeouts or network errors as empty arrays (`[]`), which causes the agent to falsely conclude no records exist[cite: 1].
- **Empirical Measurement: Token Optimization via Case Facts & Scratchpad**:
  - *Baseline vs. Optimized:* On Scenario 3 (Parallel Billing + Returns), total input tokens per turn stabilized while preserving 100% precision for critical numerical facts (PKR 12,500 duplicate refund, PKR 15,000 return, ORD-5001, INV-1001).
  - *Context Degradation Capped:* Tool payload trimming and structured `## CASE FACTS` headers prevent context window inflation in multi-turn sessions (averaging 20-40% savings on deep multi-turn turns 5-10).
  - *Session Resumption:* Scratchpad state (`.claude/scratchpad-C-1001.json`) persists resolved/pending issues to disk, allowing session rehydration with zero token overhead.