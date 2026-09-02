// test-naming.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { BAD_NAMED_TOOLS } from "./bad/tools.js"
import { GOOD_NAMED_TOOLS } from "./good/tools.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// Two types of tests:
// Type A — Can Claude call the tool with correct parameters?
//           (Tests whether the type/operation anti-pattern confuses it)
// Type B — Does Claude pick the right tool when names are clear?
//           (Tests whether names carry enough signal)

const NAMING_TESTS = [
    // Type A — Parameter confusion tests (bad tools have type/operation params)
    {
        query: "Get me the customer profile for C-1001.",
        toolset: "bad",
        check: (toolUse) => {
            // Bad tools require type parameter — does Claude know to pass 'customer'?
            const correctTool = toolUse?.name === "get_data"
            const correctParam = toolUse?.input?.type === "customer"
            return {
                pass: correctTool && correctParam,
                detail: `tool=${toolUse?.name}, type=${toolUse?.input?.type}`
            }
        },
        label: "BAD: Customer profile — must pass type:'customer'"
    },
    {
        query: "Process a refund of PKR 12,500 for customer C-1001.",
        toolset: "bad",
        check: (toolUse) => {
            const correctTool = toolUse?.name === "handle_payment"
            const correctOp = toolUse?.input?.operation === "refund"
            return {
                pass: correctTool && correctOp,
                detail: `tool=${toolUse?.name}, operation=${toolUse?.input?.operation}`
            }
        },
        label: "BAD: Process refund — must pass operation:'refund'"
    },
    {
        query: "Check if order ORD-5001 is eligible for return. Purchased 12 days ago.",
        toolset: "bad",
        check: (toolUse) => {
            const correctTool = toolUse?.name === "manage_support"
            const correctAction = toolUse?.input?.action === "check_return"
            return {
                pass: correctTool && correctAction,
                detail: `tool=${toolUse?.name}, action=${toolUse?.input?.action}`
            }
        },
        label: "BAD: Return eligibility — must pass action:'check_return'"
    },

    // Type B — Clean selection tests (good tools — does name carry the signal?)
    {
        query: "Get me the customer profile for C-1001.",
        toolset: "good",
        check: (toolUse) => {
            return {
                pass: toolUse?.name === "get_customer",
                detail: `tool=${toolUse?.name}`
            }
        },
        label: "GOOD: Customer profile — get_customer selected directly"
    },
    {
        query: "Process a refund of PKR 12,500 for customer C-1001.",
        toolset: "good",
        check: (toolUse) => {
            return {
                pass: toolUse?.name === "process_refund",
                detail: `tool=${toolUse?.name}`
            }
        },
        label: "GOOD: Process refund — process_refund selected directly"
    },
    {
        query: "Check if order ORD-5001 is eligible for return. Purchased 12 days ago.",
        toolset: "good",
        check: (toolUse) => {
            return {
                pass: toolUse?.name === "check_return_eligibility",
                detail: `tool=${toolUse?.name}`
            }
        },
        label: "GOOD: Return eligibility — check_return_eligibility selected"
    },
    {
        query: "Show me all payment transactions for customer C-1001.",
        toolset: "good",
        check: (toolUse) => {
            return {
                pass: toolUse?.name === "check_payment_history",
                detail: `tool=${toolUse?.name}`
            }
        },
        label: "GOOD: Payment history — check_payment_history selected"
    },
    {
        query: "Escalate this case — customer demands a human agent.",
        toolset: "good",
        check: (toolUse) => {
            return {
                pass: toolUse?.name === "escalate_to_human",
                detail: `tool=${toolUse?.name}`
            }
        },
        label: "GOOD: Escalation — escalate_to_human selected"
    }
]

async function runTest(test, allTools) {
    const tools = test.toolset === "bad" ? BAD_NAMED_TOOLS : GOOD_NAMED_TOOLS
    // For bad tools test: use all bad tools
    // For good tools test: use all good tools

    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: `You are a ClaudeCare support agent.
Call the most appropriate tool to handle the customer request.
Customer identity is already verified — focus on the task.`,
        tools,
        tool_choice: { type: "any" },
        messages: [{ role: "user", content: test.query }]
    })

    const toolUse = response.content.find(b => b.type === "tool_use")
    const result = test.check(toolUse)
    await new Promise(r => setTimeout(r, 600))
    return result
}

async function main() {
    console.log("TOOL NAMING TEST")
    console.log("Proving: good names reduce cognitive load on Claude")
    console.log("Bad names force Claude to track hidden parameters\n")

    let badCorrect = 0
    let goodCorrect = 0

    console.log("=".repeat(60))
    console.log("BAD TOOLS — Consolidated with type/operation parameters")
    console.log("=".repeat(60))

    const badTests = NAMING_TESTS.filter(t => t.toolset === "bad")
    for (const test of badTests) {
        const result = await runTest(test, BAD_NAMED_TOOLS)
        const status = result.pass ? "✅ PASS" : "❌ FAIL"
        if (result.pass) badCorrect++
        console.log(`${status} | ${test.label}`)
        console.log(`       ${result.detail}`)
    }

    console.log(`\nBad tools score: ${badCorrect}/${badTests.length}`)

    console.log("\n" + "=".repeat(60))
    console.log("GOOD TOOLS — Split with descriptive names")
    console.log("=".repeat(60))

    const goodTests = NAMING_TESTS.filter(t => t.toolset === "good")
    for (const test of goodTests) {
        const result = await runTest(test, GOOD_NAMED_TOOLS)
        const status = result.pass ? "✅ PASS" : "❌ FAIL"
        if (result.pass) goodCorrect++
        console.log(`${status} | ${test.label}`)
        console.log(`       ${result.detail}`)
    }

    console.log(`\nGood tools score: ${goodCorrect}/${goodTests.length}`)

    console.log("\n" + "=".repeat(60))
    console.log("WHAT THIS PROVES")
    console.log("=".repeat(60))
    console.log(`Bad (consolidated): ${badCorrect}/${badTests.length} — Claude must guess hidden params`)
    console.log(`Good (split):       ${goodCorrect}/${goodTests.length} — name carries the signal`)
    console.log(`
Key observations:
  Bad tools: Claude must know to pass type:'customer' vs type:'order'
             This knowledge comes from... where exactly? The description.
             Which means the name added zero signal — only the description works.

  Good tools: Claude reads 'process_refund' and immediately knows.
              The name pre-filters before the description is even read.
              Selection is faster and more reliable.

Consolidation anti-pattern: when you see type/operation/action
  parameters in a tool — that tool should have been split.
  Those parameters are a routing layer pretending to be a tool.`)
}

main().catch(console.error)