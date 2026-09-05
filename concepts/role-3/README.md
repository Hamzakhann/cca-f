A tool is only as good as its description, its schema, and its error response — because Claude cannot see your code, only your words.


### 7 Concepts — One Line Each
1. Description    → Claude reads words, not code. Bad words = wrong tool.
2. Naming         → Name carries signal before description is read. Split > consolidate.
3. Anti-patterns  → 6 ways descriptions fail. Each causes a different problem.
4. Schemas        → Nullable prevents fabrication. Required on absent data = invented values.
5. Reliability    → Accuracy is not enough. Consistency across runs is the real target.
6. Errors         → 4 categories. isRetryable tells Claude what to do next.
7. Empty vs Fail  → { payments: [] } in catch block = silent financial bug.

### The 5 Description Components
Every tool. Every time. No exceptions.
1. What it does      → one sentence, specific action
2. What it returns   → every field, every type, every enum value
3. When to use       → explicit trigger phrases
4. When NOT to use   → name the alternative tool explicitly
5. Example input     → realistic data in correct format

### The 4 Error Categories
transient   → isRetryable: true   (timeout, service down)
validation  → isRetryable: true   (wrong input format)
permission  → isRetryable: false  (no authority)
business    → isRetryable: false  (policy says no)


### 4 required fields always:
isError: true
errorCategory: one of the 4 above
isRetryable: true or false
description: specific enough for Claude to explain to the customer


### The 3 Field Types in Schemas
required          → tool cannot run without it, value always exists
optional          → improves result, absence is fine, use a default
nullable required → must be answered, but null = honest "not present"

The rule: If the information might not exist in the source → nullable required, never plain required.


### The Access Failure Rule
INSIDE try  → return data (empty array = "confirmed no records")
INSIDE catch → return isError: true (NEVER return empty array)

Why it matters: { payments: [] } looks identical whether the database returned nothing or timed out. Only isError: true tells them apart. Without it — Claude denies legitimate refund claims.


### The Selection Reliability Truth
Direct queries   → almost always reliable
Indirect queries → need strong Component 3 (trigger phrases)
Ambiguous queries → need strong Component 4 (negative boundaries)


### The Anti-Pattern Quick Reference
1. Vague action          → "Gets customer info" — differentiates nothing
2. Missing return shape  → Claude hopes the field exists
3. Missing boundary      → Claude uses wrong tool on ambiguous queries
4. Overlapping scope     → random selection between similar tools
5. Wrong consolidation   → type/operation parameter = hidden routing layer
6. Action in read tool   → silent side effects, unintended writes


### The Split vs Consolidate Rule
Split when:
  Different inputs → different parameters → always split
  Different outputs → different return shapes → always split
  Read vs write → different side effects → always split

Consolidate only when:
  Caller genuinely doesn't need to know the type
  Results are uniformly shaped regardless of input



### The Complete Decision Flow
When you design a new tool:

1. Name it          → domain + action verb, split if different inputs/outputs
2. Write Component 1 → what it does (specific, not vague)
3. Write Component 2 → every field in the return value
4. Write Component 3 → explicit trigger phrases (include informal language)
5. Write Component 4 → name alternatives explicitly
6. Write Component 5 → realistic example
7. Design schema     → required/optional/nullable using the decision tree
8. Write executor    → try = valid result, catch = isError: true always
9. Test selection    → direct, indirect, ambiguous — 3 runs each
10. Test errors      → all 4 categories, check isRetryable is correct




=======================================




Configuration determines who gets your tools, how credentials stay safe, when tools are discovered, what reference data costs nothing to read, and how many tools each agent should have.


### 5 Concepts — One Line Each
8.  Config scope    → .mcp.json is team-shared. ~/.claude.json is personal.
9.  Env expansion   → ${VAR} in the file. Real value in .env. Never in git.
10. Discovery       → All tools load once at session start. New tool = restart.
11. Resources       → Stable policy docs loaded free. Tools for live data only.
12. Scoping         → 5 tools max per agent. One registry, filtered per role.


### Concept 8 — The Two Files

.mcp.json
  Location:  repo root
  Committed: YES
  Who gets:  everyone who clones
  Use for:   team tools

~/.claude.json
  Location:  home directory
  Committed: NEVER
  Who gets:  only you
  Use for:   personal experiments


Exam scenario: Works for one developer, fails for everyone else → config is in ~/.claude.json. Fix: move to .mcp.json.


### The .gitignore rule:
.env       → IN .gitignore     (real secrets)
.mcp.json  → NOT in .gitignore (safe with ${VAR})


### Concept 9 — The Three Rules
Rule 1: Secrets → .env → gitignored
        Real values live here. Never commit.

Rule 2: .mcp.json → ${VAR} → committed
        Placeholders only. Claude resolves at runtime.

Rule 3: Accidental commit → rotate immediately
        Git history is permanent.
        Deleting in next commit does not remove from history.


What Claude Code does with ${ANTHROPIC_API_KEY}:
Looks up process.env.ANTHROPIC_API_KEY at runtime. Substitutes in memory. File on disk never changes. Git never sees the real value.



### Concept 10 — The Three Implications

Implication 1: All tools available from turn 1
               No activation needed. Select by description.

Implication 2: New tool added? Restart Claude Code.
               Discovery already happened. Session cannot see it.

Implication 3: Server offline at startup = tools missing all session.
               Fix server AND restart Claude Code.

### Concept 11 — Resources vs Tools


Resources (the policy binder):
  Stable data — same for every request
  Loaded once at session start
  Zero tokens per access
  Use for: policies, limits, SLAs, criteria

Tools (the phone call):
  Live data — varies per request
  Round-trip per access
  Tokens consumed per call
  Use for: customer records, orders, payments, actions


### Token math:

1,000 tickets × 3 policy checks × 150 tokens = 450,000 tokens/day
With resources: 0 additional tokens



### Concept 12 — The Scoping Rules

ClaudeCare scope:
  coordinator:  0 tools  (routes only)
  billing:      5 tools  (customer, invoice, payments, refund, escalate)
  returns:      4 tools  (customer, order, eligibility, escalate)
  technical:    4 tools  (customer, api_status, error_logs, escalate)


### DESIGN LAYER (Day A)
  1. Description    → 5 components, every tool, no exceptions
  2. Naming         → domain + action verb, split > consolidate
  3. Anti-patterns  → 6 failure modes, each causes different problem
  4. Schemas        → nullable prevents fabrication
  5. Reliability    → consistency across runs, not just accuracy
  6. Errors         → 4 categories, isRetryable tells Claude what to do
  7. Empty vs fail  → { } in catch = silent bug

### CONFIGURATION LAYER (Day B)
  8. Config scope   → .mcp.json (team) vs ~/.claude.json (personal)
  9. Env expansion  → ${VAR} in file, real value in .env
  10. Discovery     → once at session start, restart for new tools
  11. Resources     → policy docs free, tools for live data
  12. Scoping       → 5 tools max, one registry filtered per agent


### The 5 Exam Traps — Role 3 Edition

Trap 1: "Works for me but not my team"
        → Config in ~/.claude.json not .mcp.json

Trap 2: "I deleted the secret from .mcp.json so it's safe"
        → Git history is permanent. Rotate the key.

Trap 3: "I added a tool, Claude Code doesn't see it"
        → Restart Claude Code. Discovery already happened.

Trap 4: "I use a get_policy tool for refund limits"
        → That's a resource. Same data every request = resource.

Trap 5: "Every agent has all tools for flexibility"
        → Selection degrades above 18 tools. Scope per role.