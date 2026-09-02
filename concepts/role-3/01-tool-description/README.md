Component    Question it answers                  What happens without it
──────────────────────────────────────────────────────────────────────────
1. What      "What does this tool do?"            Claude doesn't know purpose
2. Returns   "What will I get back?"              Claude can't plan next step
3. When      "Which signals mean: use this?"      Claude guesses on triggers
4. NOT when  "Which signals mean: don't use this?"Claude misroutes on similar queries
5. Example   "What does a real call look like?"   Claude uses wrong input format



Tool descriptions are not documentation — they are the instructions Claude uses to decide which tool to call. A vague description is a broken selection signal. All 5 components are required for reliable selection on ambiguous queries.


Tool descriptions determine WHICH tool gets called. tool_choice determines WHETHER a tool gets called. In a selection reliability test, you want to isolate the first variable — so you force the second.'


Tool descriptions control which tool is selected for a given intent. They do not control the order of tool calls in an agentic workflow. An agent that always verifies customer identity first is not broken — it is correct.


Tool descriptions control which tool Claude selects
when multiple tools are plausible.

Component 4 — "When NOT to use" — is the most important
component for preventing misrouting on ambiguous queries.

Without negative boundaries: Claude defaults to the most
generic available tool when unsure.

With negative boundaries: Claude has a decision procedure
that eliminates wrong choices explicitly.

The exam tests this at the architectural level.
Know the why, not just the score.




1. Tool descriptions ARE the selection mechanism — not code, not prompts
2. All 5 components are required — each serves a specific purpose
3. Component 4 (When NOT to use) prevents generic tool defaulting
4. Descriptions work at the architectural level — the exam tests why,
   not empirical scores
5. Ambiguous queries without identifiers create genuine uncertainty
   that descriptions cannot fully resolve — context injection solves this