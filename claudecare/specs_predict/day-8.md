### SPEC 
Defines the structure of Claude Code's review output. Every finding must have a file path, line number, severity, category, description, and a suggested fix. The schema also requires a summary section with total findings counts per severity. This is the contract — CI automation parses this schema to post inline PR comments.

### PREDICTED EXECUTION 
A review of process_refund.js that finds one issue should produce:

json
{
  "findings": [
    {
      "file": "src/mcp/tools/process_refund.js",
      "line": 23,
      "severity": "high",
      "category": "error-structure",
      "description": "Throws raw Error instead of returning structured error object with isError, errorCategory, isRetryable fields",
      "suggestion": "Return { isError: true, errorCategory: 'transient', isRetryable: true, description: '...' } instead of throwing"
    }
  ],
  "summary": {
    "total": 1,
    "high": 1,
    "medium": 0,
    "low": 0,
    "passed": false
  }
}


### SPEC 


A GitHub Actions workflow that triggers on every pull request. It runs Claude Code in non-interactive mode with -p, passes the review schema, reads CLAUDE.md for project context, produces structured JSON findings, and posts a summary comment on the PR. A separate job handles the review from the implementation job — session isolation enforced at the workflow level.


### PREDICTED EXECUTION 
PR trigger -> Checkout -> Run Claude Code with -p --json-schema -> Generate review-output.json -> Commit prior findings -> Post PR comment.


---

## Interview Pattern Exercise Log (Day 8)

### Interview Prompt Initiated:
> "I need to add response caching to ClaudeCare's agentic loop. Before you write any code, interview me. Ask every question you need answered to implement this correctly. Do not implement anything yet."

### Questions Asked by Claude Code CLI:

1. **What kind of caching is needed?**
   - *Options:* Anthropic prompt caching (`cache_control`), application-level response cache (skip Claude calls), or MCP tool-result memoization?
2. **Where does the cache live in the loop scope?**
   - *Options:* Per-turn inside `src/agent/loop.js`, or as a wrapper around the entire conversation?
3. **How do lifecycle hooks interact with cached results?**
   - *Options:* Should PreToolCall (`refundGuard`) and PostToolUse (`normalizer`) run on cached paths, or does a cache hit bypass hooks?
4. **Which tools are safe to cache vs. excluded?**
   - *Options:* Cache all tools, or explicitly exclude state-mutating action tools (e.g. `process_refund`, `escalate_to_human`)?
5. **How are cache keys, TTL, and eviction handled?**
   - *Options:* What composes the key hash, what is the default TTL, and what storage backend (in-memory LRU Map vs Redis) should be used?
6. **How should `stop_reason` behave on cache hits?**
   - *Options:* Replay stored response verbatim with original `stop_reason`, or synthesize a new `end_turn` signal?
7. **Are there PII or compliance constraints?**
   - *Options:* Redaction requirements for customer data before caching or persistence duration caps?

### Concrete Answers Provided:

1. **Caching Type:** Application-level response cache for idempotent tool outputs + Anthropic prompt caching (`cache_control`) on static system prompts.
2. **Loop Scope:** Per-turn memoization inside `src/agent/loop.js`.
3. **Hook Enforcement:** **Hooks must ALWAYS run on cached paths.** A cache hit must never bypass PreToolCall security guards (`refundGuard`) or PostToolUse formatting (`normalizer`).
4. **Tool Whitelist/Blacklist:** Only read-only query tools (`get_customer`, `lookup_order`, `get_invoice`, `check_return_eligibility`, `check_api_status`) may be cached. Action tools (`process_refund`, `escalate_to_human`) are **never cached**.
5. **Keys & Storage:** Key = SHA-256 hash of `(toolName + JSON.stringify(toolArgs))`. In-memory LRU `Map` (max 1000 items) with a default 300-second (5 min) TTL.
6. **Stop Reason Handling:** Replay stored assistant response verbatim, preserving its exact `stop_reason`.
7. **Privacy & Security:** No persistence across process restarts; in-memory cache expires automatically to satisfy PII constraints.
