// test-selection.js — FINAL CORRECT VERSION
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { BAD_TOOLS } from "./bad/tools.js"
import { GOOD_TOOLS } from "./good/tools.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// These queries test DISAMBIGUATION — cases where 2+ tools are plausible
// and only the description's negative boundaries make the right one clear
const TEST_QUERIES = [
    {
        query: `Customer C-1001's account has already been verified.
            Now check their recent headphone purchase — order details only.`,
        expected: "lookup_order",
        wrong_if: "get_customer",
        reason: "After identity verification, 'purchase details' should map to lookup_order not get_customer"
    },
    {
        query: `We need to investigate whether C-1001 was charged twice.
            Get the payment transaction records.`,
        expected: "check_payment_history",
        wrong_if: "get_customer",
        reason: "Duplicate charge investigation needs transaction records, not account profile"
    },
    {
        query: `Customer C-1001's identity is confirmed. They want to know
            if their refund from last week was processed. Check it.`,
        expected: "check_payment_history",
        wrong_if: "get_customer",
        reason: "Refund verification = check payment history for 'refunded' status"
    },
    {
        query: `I have customer C-1001's profile already. Now I need the
            payment history — did they make multiple payments on INV-1001?`,
        expected: "check_payment_history",
        wrong_if: "get_customer",
        reason: "Explicit: already have profile, need payment records"
    },
    {
        query: `Customer C-1001 is confirmed active premium tier.
            Now retrieve the specific order ORD-5001 details.`,
        expected: "lookup_order",
        wrong_if: "get_customer",
        reason: "Explicit: account checked, now need order details"
    },
    {
        query: `The duplicate charge on C-1001's account is confirmed.
            Process a refund of PKR 12,500. Reason: duplicate payment PAY-8002.`,
        expected: "process_refund",
        wrong_if: "get_customer",
        reason: "Action explicitly stated, verification already done"
    },
    {
        query: `Get me the transaction list for C-1001 — I need to see
            all the individual payment entries, not the account summary.`,
        expected: "check_payment_history",
        wrong_if: "get_customer",
        reason: "'Individual payment entries' not 'account summary' = payment history"
    },
    {
        query: `Tell me the shipping status of C-1001's last order.
            They say it should have arrived already.`,
        expected: "lookup_order",
        wrong_if: "get_customer",
        reason: "Shipping status is on the order record, not the account"
    }
]

async function testSelection(tools, toolsetName) {
    console.log(`\n${"=".repeat(55)}`)
    console.log(`Testing: ${toolsetName}`)
    console.log("=".repeat(55))

    let correct = 0
    let wrong_default = 0
    const results = []

    for (const { query, expected, wrong_if, reason } of TEST_QUERIES) {
        const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 256,
            system: `You are a ClaudeCare support agent. Customer identity has already
been verified in a prior step. You must now call the single most
appropriate tool to complete the specific task in the message.
Call exactly one tool. Do not call get_customer for identity
verification — that was already done.`,
            tools,
            tool_choice: { type: "any" },
            messages: [{ role: "user", content: query }]
        })

        const toolUse = response.content.find(b => b.type === "tool_use")
        const selected = toolUse?.name || "NO_TOOL_CALLED"
        const passed = selected === expected
        const defaulted = selected === wrong_if

        if (passed) correct++
        if (defaulted) wrong_default++

        results.push({ query: query.split('\n')[0].trim(), expected, selected, passed, reason })
        await new Promise(r => setTimeout(r, 600))
    }

    console.log("\nExpected → Selected → Result")
    console.log("-".repeat(55))
    for (const r of results) {
        const status = r.passed ? "✅ PASS" : "❌ FAIL"
        console.log(`${status} | Expected: ${r.expected.padEnd(25)} | Got: ${r.selected}`)
        if (!r.passed) console.log(`       "${r.query}"`)
    }

    console.log(`\nScore: ${correct}/${TEST_QUERIES.length}`)
    console.log(`Defaulted to wrong tool: ${wrong_default}/${TEST_QUERIES.length}`)
    return correct
}

async function main() {
    console.log("TOOL DESCRIPTION DISAMBIGUATION TEST")
    console.log("Measuring: do negative boundaries prevent misrouting?\n")

    const badScore = await testSelection(BAD_TOOLS, "BAD  — minimal descriptions (no boundaries)")
    const goodScore = await testSelection(GOOD_TOOLS, "GOOD — 5-component (explicit 'Do NOT use for')")

    console.log("\n" + "=".repeat(55))
    console.log("FINAL COMPARISON")
    console.log("=".repeat(55))
    console.log(`Bad descriptions:  ${badScore}/8  (${Math.round(badScore / 8 * 100)}%)`)
    console.log(`Good descriptions: ${goodScore}/8  (${Math.round(goodScore / 8 * 100)}%)`)
    console.log(`\nGap: ${goodScore - badScore > 0 ? '+' : ''}${goodScore - badScore} correct selections`)
    console.log(`\nKey insight: The gap between these scores is the value of Component 4`)
    console.log(`(When NOT to use). Without it, Claude defaults to the most`)
    console.log(`generic tool. With it, the selection boundaries are sharp.`)
}

main().catch(console.error)