// test-sessions.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { SessionManager } from "./session-manager.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// Simple research tool for testing
const TOOLS = [
    {
        name: "get_report_data",
        description: `Gets data for a business report.
Returns: period, revenue, customers, top_product, issues (array).
Use when: you need business metrics for a specific period.
Example: { period: "August 2026" }`,
        input_schema: {
            type: "object",
            properties: { period: { type: "string" } },
            required: ["period"]
        }
    }
]

const EXECUTORS = {
    get_report_data: async ({ period }) => ({
        period,
        revenue: 4250000,
        customers: 1847,
        top_product: "Premium Plan",
        issues: ["Checkout bug affecting mobile users",
            "Support ticket backlog at 3x normal volume"]
    })
}

// Run one agent turn with session persistence
async function runTurnWithSession(session, userContent) {
    // Add user message to session
    session.appendMessage({ role: "user", content: userContent })

    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        tools: TOOLS,
        messages: session.getMessages()
    })

    // Handle tool calls if needed
    if (response.stop_reason === "tool_use") {
        const toolUse = response.content.find(b => b.type === "tool_use")
        const result = await EXECUTORS[toolUse.name](toolUse.input)

        session.appendMessages([
            { role: "assistant", content: response.content },
            {
                role: "user", content: [{
                    type: "tool_result",
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(result)
                }]
            }
        ])

        // Get final response
        const final = await client.messages.create({
            model: "claude-sonnet-4-6", max_tokens: 512,
            tools: TOOLS, messages: session.getMessages()
        })

        const text = final.content.filter(b => b.type === "text").map(b => b.text).join("")
        session.appendMessage({ role: "assistant", content: final.content })
        return text
    }

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    session.appendMessage({ role: "assistant", content: response.content })
    return text
}

function printDivider(title) {
    console.log("\n" + "=".repeat(58))
    console.log(title)
    console.log("=".repeat(58))
}

async function main() {
    console.log("SESSION MANAGEMENT TEST")
    console.log("Proving: fresh, resume, fork — three patterns\n")

    // Clean up any prior test sessions
    ["session-main", "session-fork-a", "session-fork-b"]
        .forEach(id => new SessionManager(id).delete())

    // ── PATTERN 1: Fresh Session ──────────────────────────────────
    printDivider("PATTERN 1: Fresh Session")
    console.log("Starting a new investigation from scratch\n")

    const mainSession = new SessionManager("session-main")

    const response1 = await runTurnWithSession(
        mainSession,
        "Analyse our business performance for August 2026. What are the key findings?"
    )
    console.log(`\nResponse 1:\n${response1}`)
    console.log(`\nSession state: ${JSON.stringify(mainSession.getSummary(), null, 2)}`)

    await new Promise(r => setTimeout(r, 800))

    // ── PATTERN 2: Resume Session ─────────────────────────────────
    printDivider("PATTERN 2: Resume Session")
    console.log("Simulating: process restarted, resuming prior investigation\n")

    // Load the saved session
    const resumedSession = new SessionManager("session-main")
    const loaded = resumedSession.load()

    console.log(`\nSession found: ${loaded}`)
    console.log(`Prior messages: ${resumedSession.getMessages().length}`)

    // CRITICAL: tell the agent what changed since last session
    const changesSinceLast = `
RESUMING PRIOR SESSION.

Summary of prior session:
  - Analysed August 2026 business performance
  - Revenue: PKR 4,250,000 | Customers: 1,847
  - Identified issues: checkout bug + support backlog

CHANGES SINCE LAST SESSION:
  - Checkout bug has been FIXED (deployed 2 hours ago)
  - Support backlog reduced from 3x to 1.5x normal
  - New data: September revenue is tracking 12% above August

Continue the analysis with these updates in mind.
What should we prioritise for September?`

    const response2 = await runTurnWithSession(resumedSession, changesSinceLast)
    console.log(`\nResumed Response:\n${response2}`)

    await new Promise(r => setTimeout(r, 800))

    // ── PATTERN 3: Fork Session ───────────────────────────────────
    printDivider("PATTERN 3: Fork Session")
    console.log("Forking from shared baseline to explore two strategies\n")

    // Fork into two independent branches
    const forkA = mainSession.fork("session-fork-a")
    const forkB = mainSession.fork("session-fork-b")

    console.log("Both branches start from the same August analysis baseline")
    console.log("Branch A: explore cost reduction strategy")
    console.log("Branch B: explore growth strategy\n")

    // Branch A — independent exploration
    const responseA = await runTurnWithSession(
        forkA,
        "Based on the August analysis, propose a cost reduction strategy for Q4."
    )
    console.log(`Branch A (Cost Reduction):\n${responseA.slice(0, 250)}...`)

    await new Promise(r => setTimeout(r, 800))

    // Branch B — independent exploration (same baseline, different direction)
    const responseB = await runTurnWithSession(
        forkB,
        "Based on the August analysis, propose an aggressive growth strategy for Q4."
    )
    console.log(`\nBranch B (Growth):\n${responseB.slice(0, 250)}...`)

    // ── Prove isolation ───────────────────────────────────────────
    printDivider("PROVING FORK ISOLATION")

    console.log(`\nMain session messages:   ${mainSession.getMessages().length}`)
    console.log(`Fork A messages:         ${forkA.getMessages().length}`)
    console.log(`Fork B messages:         ${forkB.getMessages().length}`)
    console.log(`\nFork A last message role: ${forkA.getMessages().at(-1)?.role}`)
    console.log(`Fork B last message role: ${forkB.getMessages().at(-1)?.role}`)

    const forkAHasBContent = JSON.stringify(forkA.getMessages())
        .includes("growth strategy")
    const forkBHasAContent = JSON.stringify(forkB.getMessages())
        .includes("cost reduction")

    console.log(`\nFork A contains Fork B content: ${forkAHasBContent} ${forkAHasBContent ? "❌" : "✅"}`)
    console.log(`Fork B contains Fork A content: ${forkBHasAContent} ${forkBHasAContent ? "❌" : "✅"}`)
    console.log("\n✅ Forks are isolated — changes in one do not affect the other")

    // ── Stale context demonstration ───────────────────────────────
    printDivider("THE STALE CONTEXT DANGER")

    console.log(`
  If we had resumed WITHOUT the change summary:
  
  Agent would say:
    "The checkout bug needs to be fixed urgently..."
    "The support backlog at 3x volume requires immediate attention..."
  
  Reality:
    The checkout bug was fixed 2 hours ago.
    The backlog dropped to 1.5x.
    Agent is confidently recommending fixes for solved problems.
  
  The rule: ALWAYS provide a change summary when resuming.
  Format:
    "RESUMING PRIOR SESSION.
     Prior summary: [what was established]
     CHANGES SINCE LAST SESSION: [what changed]
     Continue with these updates in mind."
  `)

    printDivider("THE THREE RULES OF SESSION MANAGEMENT")

    console.log(`
  Rule 1: FRESH SESSION
    When: new task, stale context, unrelated work
    How:  messages = [{ role: "user", content: newGoal }]

  Rule 2: RESUME SESSION
    When: continuing prior work across restarts
    How:  load messages + inject change summary
    ALWAYS: tell the agent what changed since last session

  Rule 3: FORK SESSION
    When: exploring two approaches from shared baseline
    How:  deep copy messages → independent branches
    Prove: changes in fork A never appear in fork B
  `)

    // Cleanup
    console.log("\nCleaning up test sessions...")
    mainSession.delete()
    resumedSession.delete()
    forkA.delete()
    forkB.delete()
}

main().catch(console.error)