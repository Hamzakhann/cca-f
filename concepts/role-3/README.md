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