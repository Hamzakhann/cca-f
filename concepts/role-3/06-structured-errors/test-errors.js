// test-errors.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { definition, executor } from "./tools/get_customer_with_errors.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// ── Unit tests — executor directly ───────────────────────────────
// Test the tool executor directly first (no Claude involved)
// This proves the error structure is correct before we involve the API

async function testExecutorDirectly() {
    console.log("=".repeat(55))
    console.log("PART 1: Unit Tests — Executor Directly")
    console.log("Testing error structure without Claude")
    console.log("=".repeat(55))

    const cases = [
        {
            label: "transient — database timeout",
            input: { customer_id: "C-0000" },
            expect: { isError: true, errorCategory: "transient", isRetryable: true }
        },
        {
            label: "validation — wrong format",
            input: { customer_id: "ahmed" },
            expect: { isError: true, errorCategory: "validation", isRetryable: true }
        },
        {
            label: "validation — missing prefix",
            input: { customer_id: "1001" },
            expect: { isError: true, errorCategory: "validation", isRetryable: true }
        },
        {
            label: "permission — restricted account",
            input: { customer_id: "C-9999" },
            expect: { isError: true, errorCategory: "permission", isRetryable: false }
        },
        {
            label: "business — unknown customer",
            input: { customer_id: "C-5555" },
            expect: { isError: true, errorCategory: "business", isRetryable: false }
        },
        {
            label: "success — valid customer",
            input: { customer_id: "C-1001" },
            expect: { isError: undefined, name: "Ahmed Ali" }
        }
    ]

    let passed = 0
    for (const { label, input, expect } of cases) {
        const result = await executor(input)

        let ok = true
        const mismatches = []

        for (const [key, expectedVal] of Object.entries(expect)) {
            if (result[key] !== expectedVal) {
                ok = false
                mismatches.push(`${key}: expected ${expectedVal}, got ${result[key]}`)
            }
        }

        if (ok) {
            passed++
            console.log(`✅ ${label}`)
            if (result.isError) {
                console.log(`   errorCategory: ${result.errorCategory}`)
                console.log(`   isRetryable:   ${result.isRetryable}`)
                console.log(`   description:   ${result.description.slice(0, 70)}...`)
            } else {
                console.log(`   name: ${result.name}, tier: ${result.account_tier}`)
            }
        } else {
            console.log(`❌ ${label}`)
            mismatches.forEach(m => console.log(`   MISMATCH: ${m}`))
        }
        console.log()
    }

    console.log(`Unit test result: ${passed}/${cases.length} passed\n`)
    return passed === cases.length
}

// ── Integration test — Claude receives errors and reasons ─────────
// Now test how Claude responds when it receives each error type.
// This proves Claude can make the right recovery decision from
// a structured error response.

async function runAgentWithError(userMessage, triggerCustomerId) {
    const messages = [
        { role: "user", content: userMessage }
    ]

    // Turn 1: Claude calls get_customer
    const response1 = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: `You are a ClaudeCare support agent.
When a tool returns an error:
- transient error: inform the user you are retrying
- validation error: fix the input and retry with correct format
- permission error: explain you need to escalate, do not retry
- business error: explain the situation to the user clearly`,
        tools: [definition],
        messages
    })

    // Execute the tool — inject the trigger ID to force specific error
    const toolUse = response1.content.find(b => b.type === "tool_use")
    if (!toolUse) return { error: "Claude did not call a tool" }

    // Override the customer_id to force the error type we want to test
    const result = await executor({ customer_id: triggerCustomerId })

    // Turn 2: Feed result back to Claude
    messages.push({ role: "assistant", content: response1.content })
    messages.push({
        role: "user",
        content: [{
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result)
        }]
    })

    const response2 = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: `You are a ClaudeCare support agent.
When a tool returns an error:
- transient error: inform the user you are retrying
- validation error: fix the input and retry with correct format
- permission error: explain you need to escalate, do not retry
- business error: explain the situation to the user clearly`,
        tools: [definition],
        messages
    })

    const finalText = response2.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("")

    const retriedCall = response2.content.find(b => b.type === "tool_use")

    return {
        error_returned: result,
        claude_response: finalText.slice(0, 200),
        claude_retried: !!retriedCall,
        stop_reason: response2.stop_reason
    }
}

async function testClaudeRecovery() {
    console.log("=".repeat(55))
    console.log("PART 2: Integration Tests — Claude Recovery Behavior")
    console.log("Testing: does Claude make the right decision per error?")
    console.log("=".repeat(55))

    const integrationCases = [
        {
            label: "transient — Claude should retry or acknowledge delay",
            userMessage: "Get the account details for customer C-1001.",
            triggerCustomerId: "C-0000",
            expectRetry: true,
            expectKeyword: ["retry", "moment", "again", "temporarily", "try"]
        },
        {
            label: "permission — Claude should NOT retry, should escalate",
            userMessage: "Look up customer C-9999 for me.",
            triggerCustomerId: "C-9999",
            expectRetry: false,
            expectKeyword: ["escalate", "senior", "permission", "authorize", "restricted"]
        },
        {
            label: "business — Claude should explain policy, not retry",
            userMessage: "Get customer C-5555's details.",
            triggerCustomerId: "C-5555",
            expectRetry: false,
            expectKeyword: ["not found", "does not exist", "verify", "check", "incorrect"]
        }
    ]

    let passed = 0
    for (const test of integrationCases) {
        console.log(`\nTest: ${test.label}`)
        console.log(`User: "${test.userMessage}"`)

        const result = await runAgentWithError(
            test.userMessage,
            test.triggerCustomerId
        )

        if (result.error) {
            console.log(`❌ Error: ${result.error}`)
            continue
        }

        console.log(`\nError returned to Claude:`)
        console.log(`  errorCategory: ${result.error_returned.errorCategory}`)
        console.log(`  isRetryable:   ${result.error_returned.isRetryable}`)

        console.log(`\nClaude's response:`)
        console.log(`  "${result.claude_response}"`)
        console.log(`  Claude retried: ${result.claude_retried}`)

        // Check if Claude's behavior matched expectations
        const retryMatch = result.claude_retried === test.expectRetry
        const keywordMatch = test.expectKeyword.some(kw =>
            result.claude_response.toLowerCase().includes(kw)
        )
        const ok = retryMatch && keywordMatch

        if (ok) {
            passed++
            console.log(`✅ Claude responded correctly`)
        } else {
            console.log(`❌ Claude response unexpected`)
            if (!retryMatch) {
                console.log(`   Expected retry: ${test.expectRetry}, got: ${result.claude_retried}`)
            }
            if (!keywordMatch) {
                console.log(`   Expected keywords: ${test.expectKeyword.join(" or ")}`)
            }
        }

        await new Promise(r => setTimeout(r, 800))
    }

    console.log(`\nIntegration test result: ${passed}/${integrationCases.length} passed`)
}

// ── Anti-pattern demonstration ────────────────────────────────────
// Show what happens when a tool throws instead of returning structure

async function demonstrateRawThrowAntipattern() {
    console.log("\n" + "=".repeat(55))
    console.log("PART 3: Anti-Pattern — Raw Throw vs Structured Error")
    console.log("=".repeat(55))

    console.log("\nScenario: tool encounters database timeout")
    console.log()

    console.log("❌ BAD — raw throw:")
    console.log("  throw new Error('Database connection failed')")
    console.log("  Result in loop catch block:")
    console.log("  → err.message = 'Database connection failed'")
    console.log("  → isError: unknown")
    console.log("  → errorCategory: unknown — transient? permanent?")
    console.log("  → isRetryable: unknown — retry or give up?")
    console.log("  → Claude cannot make an informed recovery decision")
    console.log("  → Claude gives user a generic error message")
    console.log("  → Ticket unresolved")

    console.log()
    console.log("✅ GOOD — structured return:")
    console.log("  return {")
    console.log("    isError: true,")
    console.log("    errorCategory: 'transient',")
    console.log("    isRetryable: true,")
    console.log("    description: 'Database timed out — retry in a moment'")
    console.log("  }")
    console.log("  → Claude reads errorCategory: 'transient'")
    console.log("  → Claude reads isRetryable: true")
    console.log("  → Claude retries automatically")
    console.log("  → If retry succeeds: customer gets their answer")
    console.log("  → If retry fails: Claude escalates with full context")

    console.log()
    console.log("Access failure vs valid empty result:")
    console.log()
    console.log("❌ BAD — timeout masquerading as empty:")
    console.log("  Database times out → return { payments: [] }")
    console.log("  Claude thinks: 'no payment history found'")
    console.log("  Investigates duplicate charge → finds nothing")
    console.log("  Customer denied refund → the real records exist!")

    console.log()
    console.log("✅ GOOD — access failure is explicit:")
    console.log("  Database times out → return { isError: true, errorCategory: 'transient' }")
    console.log("  Claude knows: data retrieval failed, not 'no data'")
    console.log("  Claude retries or escalates")
    console.log("  Customer gets correct investigation")
}

async function main() {
    console.log("STRUCTURED ERROR RESPONSE TEST")
    console.log("Proving: 4 categories × correct isRetryable × Claude recovery\n")

    const unitsPassed = await testExecutorDirectly()
    await new Promise(r => setTimeout(r, 500))

    await testClaudeRecovery()
    await new Promise(r => setTimeout(r, 500))

    await demonstrateRawThrowAntipattern()

    console.log("\n" + "=".repeat(55))
    console.log("THE 4 CATEGORIES — MEMORISE THIS TABLE")
    console.log("=".repeat(55))
    console.log(`
Category    │ isRetryable │ Cause                    │ Claude does
────────────┼─────────────┼──────────────────────────┼─────────────────────
transient   │    true     │ Temporary service issue  │ Wait and retry
validation  │    true     │ Bad input format         │ Fix input, retry
permission  │    false    │ No authority             │ Escalate
business    │    false    │ Policy violation         │ Explain to user
  `)
}

main().catch(console.error)