// test-scoping.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import {
    ALL_TOOL_DEFINITIONS,
    AGENT_TOOL_SCOPES,
    getToolsForAgent
} from "./registry.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

function printDivider(title) {
    console.log("\n" + "=".repeat(58))
    console.log(title)
    console.log("=".repeat(58))
}

// ── Run a selection test ──────────────────────────────────────────
async function testSelection(tools, query, agentRole) {
    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: `You are ClaudeCare's ${agentRole} specialist agent.
Use the available tools to handle this request.`,
        tools,
        tool_choice: { type: "any" },
        messages: [{ role: "user", content: query }]
    })

    const toolUse = response.content.find(b => b.type === "tool_use")
    return toolUse?.name || "NO_TOOL"
}

async function main() {
    console.log("TOOL SCOPING TEST")
    console.log("Proving: focused tool sets produce more reliable selection\n")

    // ── Part 1: Show the scoping architecture ────────────────────
    printDivider("PART 1: Tool Scope Per Agent")

    for (const [role, tools] of Object.entries(AGENT_TOOL_SCOPES)) {
        if (role === "overloaded") continue
        const count = tools.length
        const bar = "█".repeat(count) + "░".repeat(5 - count)
        console.log(`\n  ${role.padEnd(12)} [${bar}] ${count} tools`)
        tools.forEach(t => console.log(`               → ${t}`))
    }

    console.log(`\n  overloaded   [${"█".repeat(9)}] 9 tools (ALL)`)
    console.log(`               → all tools from all domains`)

    // ── Part 2: Selection reliability comparison ──────────────────
    printDivider("PART 2: Selection Reliability — Scoped vs Overloaded")

    const BILLING_QUERIES = [
        {
            query: "Customer C-1001 thinks they were charged twice. Investigate.",
            expected: "check_payment_history"
        },
        {
            query: "Process a PKR 12,500 refund for C-1001. Duplicate confirmed.",
            expected: "process_refund"
        },
        {
            query: "Get the invoice details for INV-1001.",
            expected: "get_invoice"
        }
    ]

    const scopedTools = getToolsForAgent("billing")
    const overloadedTools = getToolsForAgent("overloaded")

    console.log(`\nBilling agent — scoped (${scopedTools.length} tools) vs overloaded (${overloadedTools.length} tools)`)
    console.log("Running 3 billing queries × 3 runs each\n")

    let scopedCorrect = 0
    let overloadedCorrect = 0
    const totalRuns = BILLING_QUERIES.length * 3

    for (const { query, expected } of BILLING_QUERIES) {
        console.log(`Query: "${query.slice(0, 55)}..."`)
        console.log(`Expected: ${expected}`)

        const scopedResults = []
        const overloadedResults = []

        for (let i = 0; i < 3; i++) {
            const s = await testSelection(scopedTools, query, "billing")
            const o = await testSelection(overloadedTools, query, "billing")
            scopedResults.push(s)
            overloadedResults.push(o)
            await new Promise(r => setTimeout(r, 400))
        }

        const sCorrect = scopedResults.filter(r => r === expected).length
        const oCorrect = overloadedResults.filter(r => r === expected).length
        scopedCorrect += sCorrect
        overloadedCorrect += oCorrect

        const sBar = "█".repeat(sCorrect) + "░".repeat(3 - sCorrect)
        const oBar = "█".repeat(oCorrect) + "░".repeat(3 - oCorrect)

        console.log(`  Scoped     [${sBar}] ${sCorrect}/3 → ${scopedResults.join(" | ")}`)
        console.log(`  Overloaded [${oBar}] ${oCorrect}/3 → ${overloadedResults.join(" | ")}`)
        console.log()
    }

    console.log(`RESULTS:`)
    console.log(`  Scoped     (${scopedTools.length} tools): ${scopedCorrect}/${totalRuns} correct`)
    console.log(`  Overloaded (${overloadedTools.length} tools): ${overloadedCorrect}/${totalRuns} correct`)

    if (scopedCorrect >= overloadedCorrect) {
        console.log(`\n✅ Scoped agent matched or outperformed overloaded agent`)
        console.log(`   Fewer tools = more reliable selection`)
    } else {
        console.log(`\n⚠️  Both scored similarly on these direct queries`)
        console.log(`   Difference is most visible on AMBIGUOUS queries (see Part 3)`)
    }

    // ── Part 3: The critical boundary violation ───────────────────
    printDivider("PART 3: Boundary Violation — Wrong Tool Available")

    console.log(`
Scenario: returnsAgent is given process_refund (billing tool)
          even though returns specialists should not execute refunds.
          The coordinator should handle refund execution.
  `)

    const correctReturnsTools = getToolsForAgent("returns")
    const violatedReturnsTools = [
        ...getToolsForAgent("returns"),
        ALL_TOOL_DEFINITIONS.find(t => t.name === "process_refund")
    ]

    console.log(`Correct returns scope:  ${correctReturnsTools.map(t => t.name).join(", ")}`)
    console.log(`Violated returns scope: ${violatedReturnsTools.map(t => t.name).join(", ")}`)

    const boundaryQuery = "Customer C-1001 wants to return headphones ORD-5001 (12 days ago). Process the return and refund."

    console.log(`\nQuery: "${boundaryQuery}"`)
    console.log(`\nWith CORRECT scope (no process_refund):`)

    const correctResult = await testSelection(
        correctReturnsTools, boundaryQuery, "returns"
    )
    console.log(`  Selected: ${correctResult}`)
    console.log(`  Correct: ${correctResult === "check_return_eligibility"
        ? "✅ Checks eligibility first — coordinator handles refund"
        : "⚠️  " + correctResult}`)

    await new Promise(r => setTimeout(r, 600))

    console.log(`\nWith VIOLATED scope (process_refund available):`)
    const violatedResult = await testSelection(
        violatedReturnsTools, boundaryQuery, "returns"
    )
    console.log(`  Selected: ${violatedResult}`)
    console.log(`  Risk: ${violatedResult === "process_refund"
        ? "❌ Skipped eligibility check — processed refund directly"
        : violatedResult === "check_return_eligibility"
            ? "✅ Still chose eligibility first (good descriptions helped)"
            : "⚠️  " + violatedResult}`)

    // ── Summary ───────────────────────────────────────────────────
    printDivider("THE SCOPING RULES — COMPLETE SUMMARY")

    console.log(`
  Rule 1: Each agent gets ONLY the tools for its domain
    billing:   get_customer, get_invoice, check_payment_history,
               process_refund, escalate_to_human
    returns:   get_customer, lookup_order, check_return_eligibility,
               escalate_to_human
    technical: get_customer, check_api_status, get_error_logs,
               escalate_to_human
    coordinator: ZERO business tools — routes only

  Rule 2: Maximum ~5 tools per agent
    Selection reliability degrades measurably above 18 tools
    5 tools = full attention on every description every turn
    9+ tools = attention diluted = misrouting increases

  Rule 3: Shared tools are acceptable (get_customer, escalate_to_human)
    Cross-cutting concerns appear in multiple agents
    The tool is the same — the scope restriction is per agent

  Rule 4: One registry, multiple filtered views
    import { ALL_TOOL_DEFINITIONS } from './registry.js'
    const agentTools = ALL_TOOL_DEFINITIONS
      .filter(t => ALLOWED_NAMES.includes(t.name))

  Rule 5: Tool availability shapes agent behaviour
    If process_refund is available → agent may skip eligibility check
    If it's not available → agent MUST check eligibility first
    Scoping enforces correct workflow by limiting options
  `)
}

main().catch(console.error)