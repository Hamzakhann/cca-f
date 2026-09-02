// test-schemas.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { BAD_EXTRACTION_TOOL } from "./schemas/bad-schema.js"
import { GOOD_EXTRACTION_TOOL } from "./schemas/good-schema.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// These messages are SPARSE — they are missing some information.
// The bad schema will force fabrication on missing fields.
// The good schema will produce honest nulls.
const SPARSE_MESSAGES = [
    {
        id: "msg-1",
        label: "No customer ID, no amount, no IDs",
        message: "Hi, I think I was charged twice for something last week. Can you look into it?",
        expect_null: ["customer_id", "amount_pkr", "order_id", "invoice_id"],
        expect_not_null: ["issue_type", "severity"]
    },
    {
        id: "msg-2",
        label: "Has order ID, no customer ID or amount",
        message: "I want to return my order ORD-5001. Is that possible?",
        expect_null: ["customer_id", "amount_pkr", "invoice_id"],
        expect_not_null: ["order_id"]
    },
    {
        id: "msg-3",
        label: "Has customer ID and amount, no order or invoice",
        message: "Customer C-1001 here. I was charged PKR 12,500 but shouldn't have been.",
        expect_null: ["order_id", "invoice_id"],
        expect_not_null: ["customer_id", "amount_pkr"]
    },
    {
        id: "msg-4",
        label: "Completely sparse — no identifiers at all",
        message: "Your service is terrible and I want a refund.",
        expect_null: ["customer_id", "amount_pkr", "order_id", "invoice_id"],
        expect_not_null: ["issue_type", "action_required"]
    },
    {
        id: "msg-5",
        label: "Full information provided",
        message: "I am customer C-1001. Invoice INV-1001 shows I was charged PKR 12,500 twice via PAY-8001 and PAY-8002.",
        expect_null: ["order_id"],
        expect_not_null: ["customer_id", "invoice_id", "amount_pkr"]
    }
]

async function extractWith(tool, message) {
    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: "You are a ClaudeCare support ticket classifier. Extract structured data from the message.",
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content: message }]
    })

    const toolUse = response.content.find(b => b.type === "tool_use")
    return toolUse?.input || {}
}

function analyzeResult(extraction, test, schemaType) {
    const issues = []
    const wins = []

    for (const field of test.expect_null) {
        const value = extraction[field]
        if (value === null || value === undefined) {
            wins.push(`${field} = null ✅`)
        } else {
            issues.push(`${field} = "${value}" ← FABRICATED ❌`)
        }
    }

    for (const field of test.expect_not_null) {
        const value = extraction[field]
        if (value !== null && value !== undefined) {
            wins.push(`${field} = ${JSON.stringify(value)} ✅`)
        } else {
            issues.push(`${field} = null ← SHOULD HAVE VALUE ⚠️`)
        }
    }

    return { issues, wins }
}

async function main() {
    console.log("INPUT SCHEMA TEST")
    console.log("Proving: nullable fields prevent fabrication on sparse inputs\n")

    let badFabrications = 0
    let goodFabrications = 0
    let totalChecks = 0

    for (const test of SPARSE_MESSAGES) {
        console.log("=".repeat(60))
        console.log(`Test: ${test.label}`)
        console.log(`Message: "${test.message}"`)
        console.log("=".repeat(60))

        const badResult = await extractWith(BAD_EXTRACTION_TOOL, test.message)
        await new Promise(r => setTimeout(r, 600))
        const goodResult = await extractWith(GOOD_EXTRACTION_TOOL, test.message)
        await new Promise(r => setTimeout(r, 600))

        const badAnalysis = analyzeResult(badResult, test, "BAD")
        const goodAnalysis = analyzeResult(goodResult, test, "GOOD")

        console.log("\nBAD SCHEMA (required everything):")
        badAnalysis.wins.forEach(w => console.log(`  ${w}`))
        badAnalysis.issues.forEach(i => console.log(`  ${i}`))
        badFabrications += badAnalysis.issues.filter(i => i.includes("FABRICATED")).length

        console.log("\nGOOD SCHEMA (nullable where needed):")
        goodAnalysis.wins.forEach(w => console.log(`  ${w}`))
        goodAnalysis.issues.forEach(i => console.log(`  ${i}`))
        goodFabrications += goodAnalysis.issues.filter(i => i.includes("FABRICATED")).length

        totalChecks += test.expect_null.length + test.expect_not_null.length
        console.log()
    }

    console.log("=".repeat(60))
    console.log("FABRICATION SUMMARY")
    console.log("=".repeat(60))
    console.log(`Bad schema  (required):  ${badFabrications} fabrications detected`)
    console.log(`Good schema (nullable):  ${goodFabrications} fabrications detected`)
    console.log(`\nConclusion:`)
    console.log(`Required fields on absent data = fabrication`)
    console.log(`Nullable fields on absent data = honest null`)
    console.log(`Fabricated values look real in your database.`)
    console.log(`Null values tell you exactly what information is missing.`)
}

main().catch(console.error)