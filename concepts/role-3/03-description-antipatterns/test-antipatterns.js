// test-antipatterns.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { BROKEN_TOOLS } from "./broken/tools.js"
import { FIXED_TOOLS } from "./fixed/tools.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// Each test targets one specific anti-pattern
// We test the BROKEN version first to show it fails
// Then the FIXED version to show it succeeds
const ANTIPATTERN_TESTS = [
    {
        id: 1,
        antipattern: "Vague Action",
        query: "I need to see the payment records for customer C-1001 — all individual transactions.",
        broken_expected: "WRONG_TOOL",
        fixed_expected: "fetch_customer",
        fixed_correct: "check_payment_history",
        note: "Vague 'get_info' gets called for everything. Fixed: explicit domain names route correctly."
    },
    {
        id: 2,
        antipattern: "Missing Return Shape",
        query: "Get the customer profile for C-1001. I specifically need their account_tier.",
        broken_note: "Claude calls fetch_customer but has no guarantee account_tier exists in response",
        fixed_note: "Fixed description lists account_tier explicitly — Claude knows it will be there"
    },
    {
        id: 3,
        antipattern: "Missing Negative Boundary",
        query: "Tell me about the recent purchase history for customer C-1001.",
        broken_expected: "customer_lookup",
        fixed_expected: "lookup_order",
        note: "Without boundary: Claude uses customer_lookup for purchase queries. With boundary: 'Do NOT use for order records' routes correctly."
    },
    {
        id: 4,
        antipattern: "Overlapping Scope",
        query: "Look up order ORD-5001 — I need the shipping status.",
        broken_tools: ["customer_lookup", "analyze_record"],
        broken_expected: "analyze_record",
        fixed_tools: ["customer_lookup", "lookup_order"],
        fixed_expected: "lookup_order",
        note: "Overlapping: Claude picks randomly between similar tools. Fixed: exclusive domains."
    },
    {
        id: 5,
        antipattern: "Wrong Consolidation",
        query: "Process a return for order ORD-5001.",
        broken_expected: "process_operation",
        broken_correct_param: "return",
        fixed_expected: "check_return_eligibility",
        note: "Consolidation: Claude must guess operation type. Split: name carries the signal."
    },
    {
        id: 6,
        antipattern: "Action Buried in Read Tool",
        query: "Check the account balance for C-1001.",
        broken_expected: "check_account_balance",
        fixed_expected: "get_account_balance",
        note: "Broken: calling 'check' silently applies pending refunds. Fixed: read and write are separate."
    }
]

async function callClaude(tools, query) {
    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: `You are a ClaudeCare support agent.
Call the most appropriate tool to handle this request.
Customer identity is verified. Focus on the task.`,
        tools,
        tool_choice: { type: "any" },
        messages: [{ role: "user", content: query }]
    })

    const toolUse = response.content.find(b => b.type === "tool_use")
    return {
        tool: toolUse?.name || "NO_TOOL",
        input: toolUse?.input || {}
    }
}

async function main() {
    console.log("DESCRIPTION ANTI-PATTERN TEST")
    console.log("Proving each failure mode with broken vs fixed tools\n")

    // ── Test 1: Vague Action ──────────────────────────────────────
    console.log("=".repeat(55))
    console.log("Anti-Pattern 1: Vague Action")
    console.log("=".repeat(55))
    {
        const query = "I need to see all payment transactions for C-1001."
        const broken = await callClaude(BROKEN_TOOLS, query)
        const fixed = await callClaude(FIXED_TOOLS, query)
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool}`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`Expected: check_payment_history`)
        console.log(`Result: ${fixed.tool === "check_payment_history" ? "✅ Fixed works" : "❌ Still failing"}`)
        console.log(`\nWhy broken fails: 'get_info' accepts any ID.`)
        console.log(`Claude has no signal distinguishing customer vs payment context.`)
    }
    await new Promise(r => setTimeout(r, 700))

    // ── Test 2: Missing Return Shape ──────────────────────────────
    console.log("\n" + "=".repeat(55))
    console.log("Anti-Pattern 2: Missing Return Shape")
    console.log("=".repeat(55))
    {
        const query = "Get customer C-1001. I need their account_tier for routing."
        const broken = await callClaude(
            BROKEN_TOOLS.filter(t => t.name === "fetch_customer"),
            query
        )
        const fixed = await callClaude(
            FIXED_TOOLS.filter(t => t.name === "fetch_customer"),
            query
        )
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool}`)
        console.log(`         (description never mentions account_tier — Claude hopes it exists)`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`         (description lists account_tier explicitly — Claude is certain)`)
        console.log(`\nWhy this matters: missing return shape forces Claude to guess`)
        console.log(`whether the tool will give it what it needs.`)
        console.log(`With complete return shape: Claude is confident before calling.`)
    }
    await new Promise(r => setTimeout(r, 700))

    // ── Test 3: Missing Negative Boundary ─────────────────────────
    console.log("\n" + "=".repeat(55))
    console.log("Anti-Pattern 3: Missing Negative Boundary")
    console.log("=".repeat(55))
    {
        const query = "Show me C-1001's recent purchase of headphones — order details."
        const brokenTools = BROKEN_TOOLS.filter(t =>
            ["customer_lookup", "analyze_record"].includes(t.name)
        )
        const fixedTools = FIXED_TOOLS.filter(t =>
            ["customer_lookup", "lookup_order"].includes(t.name)
        )
        const broken = await callClaude(brokenTools, query)
        const fixed = await callClaude(fixedTools, query)
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool} (has no 'Do NOT use for orders' instruction)`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`Expected: lookup_order`)
        console.log(`Result: ${fixed.tool === "lookup_order" ? "✅ Boundary worked" : "❌ Still ambiguous"}`)
        console.log(`\nWhy broken fails: without negative boundary, 'purchase' sounds like`)
        console.log(`a customer concept. Claude uses customer_lookup — wrong tool.`)
        console.log(`With boundary: 'Do NOT use for order records' routes to lookup_order.`)
    }
    await new Promise(r => setTimeout(r, 700))

    // ── Test 4: Overlapping Scope ─────────────────────────────────
    console.log("\n" + "=".repeat(55))
    console.log("Anti-Pattern 4: Overlapping Scope")
    console.log("=".repeat(55))
    {
        const query = "Look up order ORD-5001. I need the shipping status."
        const brokenTools = BROKEN_TOOLS.filter(t =>
            ["customer_lookup", "analyze_record"].includes(t.name)
        )
        const fixedTools = FIXED_TOOLS.filter(t =>
            ["customer_lookup", "lookup_order"].includes(t.name)
        )
        const broken = await callClaude(brokenTools, query)
        const fixed = await callClaude(fixedTools, query)
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool}`)
        console.log(`         (analyze_record and customer_lookup have overlapping scope)`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`Expected: lookup_order`)
        console.log(`Result: ${fixed.tool === "lookup_order" ? "✅ Exclusive domains worked" : "❌ Still overlapping"}`)
        console.log(`\nWhy broken fails: two tools with similar scope — Claude picks`)
        console.log(`based on subtle wording. Different runs pick differently.`)
        console.log(`With exclusive domains: order queries always go to lookup_order.`)
    }
    await new Promise(r => setTimeout(r, 700))

    // ── Test 5: Wrong Consolidation ───────────────────────────────
    console.log("\n" + "=".repeat(55))
    console.log("Anti-Pattern 5: Wrong Consolidation")
    console.log("=".repeat(55))
    {
        const query = "Process a return for order ORD-5001 purchased 12 days ago."
        const brokenTools = BROKEN_TOOLS.filter(t => t.name === "process_operation")
        const fixedTools = FIXED_TOOLS.filter(t =>
            ["process_refund", "get_account_balance", "check_return_eligibility"].includes(t.name)
        )
        // Add check_return_eligibility to fixed (it's in concept 2 good tools)
        const checkReturn = {
            name: "check_return_eligibility",
            description: `Determines return eligibility under 30-day policy.
Returns: eligible (boolean), days_remaining (integer),
refund_amount (PKR), reason (string).
Use when: customer requests a return. Do NOT use for refunds.
Example: { order_id: 'ORD-5001', days_since_purchase: 12 }`,
            input_schema: {
                type: "object",
                properties: {
                    order_id: { type: "string" },
                    days_since_purchase: { type: "number" }
                },
                required: ["order_id", "days_since_purchase"]
            }
        }
        const broken = await callClaude(brokenTools, query)
        const fixed = await callClaude([...fixedTools, checkReturn], query)
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool}, operation: ${broken.input?.operation}`)
        console.log(`         (Claude guesses 'return' as the operation type)`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`Expected: check_return_eligibility`)
        console.log(`Result: ${fixed.tool === "check_return_eligibility" ? "✅ Split tools work" : "❌ Check the tool list"}`)
        console.log(`\nWhy broken fails: 'operation' parameter forces Claude to know`)
        console.log(`an internal routing decision. The tool name gave zero signal.`)
        console.log(`With split tools: 'process_return' returns a wrong image —`)
        console.log(`check_return_eligibility name carries the domain signal directly.`)
    }
    await new Promise(r => setTimeout(r, 700))

    // ── Test 6: Action Buried in Read ─────────────────────────────
    console.log("\n" + "=".repeat(55))
    console.log("Anti-Pattern 6: Action Buried in Read Tool")
    console.log("=".repeat(55))
    {
        const query = "Just check the account balance for C-1001 — no changes needed."
        const brokenTools = BROKEN_TOOLS.filter(t => t.name === "check_account_balance")
        const fixedTools = FIXED_TOOLS.filter(t => t.name === "get_account_balance")
        const broken = await callClaude(brokenTools, query)
        const fixed = await callClaude(fixedTools, query)
        console.log(`Query: "${query}"`)
        console.log(`BROKEN → tool: ${broken.tool}`)
        console.log(`         ⚠️  Calling this tool SILENTLY APPLIES pending refunds`)
        console.log(`         Claude had no idea. The description buried the write operation.`)
        console.log(`FIXED  → tool: ${fixed.tool}`)
        console.log(`         Description says READ-ONLY explicitly. No side effects.`)
        console.log(`\nWhy this is dangerous: Claude cannot know a 'check' tool writes data.`)
        console.log(`It calls it safely — and triggers an unintended financial transaction.`)
        console.log(`Fix: read tools NEVER write. Write tools have explicit action verb names.`)
    }

    console.log("\n" + "=".repeat(55))
    console.log("SUMMARY — The 6 Anti-Patterns")
    console.log("=".repeat(55))
    console.log(`
1. Vague Action       → Claude cannot differentiate tools
2. Missing Return     → Claude hopes the field exists — guesses
3. Missing Boundary   → Claude uses wrong tool on ambiguous queries
4. Overlapping Scope  → Random selection between similar tools
5. Wrong Consolidation→ Hidden routing parameter, zero name signal
6. Action in Read     → Silent side effects, unintended writes
`)
}

main().catch(console.error)