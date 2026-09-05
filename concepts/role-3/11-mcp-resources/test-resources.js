// test-resources.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { RESOURCES, getResource, listResources } from "./resources.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

function printDivider(title) {
    console.log("\n" + "=".repeat(58))
    console.log(title)
    console.log("=".repeat(58))
}

// ── Simulate agent WITH resources in system prompt ─────────────
// This is how resources are used — injected into context at session start
function buildSystemPromptWithResources() {
    const resourceContent = Object.entries(RESOURCES)
        .map(([uri, r]) => `## ${r.name}\nURI: ${uri}\n\n${r.content}`)
        .join("\n\n---\n\n")

    return `You are a ClaudeCare support agent.

The following policies are your reference — read them before
making any decision about refunds, returns, or escalation.

${resourceContent}

Apply these policies consistently. Do not guess at policy values
— the exact numbers are specified above.`
}

// ── Simulate agent WITHOUT resources ──────────────────────────
// This agent must use a tool to get policy, or guess
const SYSTEM_PROMPT_NO_RESOURCES = `You are a ClaudeCare support agent.
Help customers with billing and returns issues.
Apply company policy when making decisions.`

// ── Policy question tests ──────────────────────────────────────
const POLICY_QUESTIONS = [
    {
        id: "P1",
        question: "What is the maximum refund amount I can process automatically?",
        correct_answer: "PKR 50,000",
        check: (response) => response.includes("50,000") || response.includes("50000")
    },
    {
        id: "P2",
        question: "A customer purchased 35 days ago and wants to return. Are they eligible?",
        correct_answer: "Not eligible — 30-day window expired",
        check: (response) =>
            (response.toLowerCase().includes("not eligible") ||
                response.toLowerCase().includes("ineligible") ||
                response.toLowerCase().includes("expired") ||
                response.toLowerCase().includes("outside")) &&
            (response.includes("30") || response.includes("35"))
    },
    {
        id: "P3",
        question: "Customer is shouting and very angry. Should I escalate?",
        correct_answer: "No — anger/tone is not an escalation trigger",
        check: (response) =>
            response.toLowerCase().includes("not") ||
            response.toLowerCase().includes("tone") ||
            response.toLowerCase().includes("anger") ||
            response.toLowerCase().includes("structural") ||
            response.toLowerCase().includes("criteria")
    },
    {
        id: "P4",
        question: "What SLA applies to a Premium tier customer?",
        correct_answer: "4 hours",
        check: (response) => response.includes("4 hour") || response.includes("4-hour")
    }
]

async function askPolicyQuestion(systemPrompt, question) {
    const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: "user", content: question }]
    })

    return response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("")
}

async function main() {
    console.log("MCP RESOURCES — POLICY CATALOG TEST")
    console.log("Proving: resources give Claude policy knowledge without tool calls\n")

    // ── Part 1: List available resources ─────────────────────────
    printDivider("PART 1: Available Resources")

    const resourceList = listResources()
    console.log(`\n${resourceList.length} policy resources available:\n`)
    resourceList.forEach(r => {
        console.log(`  URI:  ${r.uri}`)
        console.log(`  Name: ${r.name}`)
        console.log(`  Desc: ${r.description}`)
        console.log()
    })

    // ── Part 2: Direct resource access ───────────────────────────
    printDivider("PART 2: Direct Resource Access")

    console.log("\nReading claudecare://policies/refund-limits:")
    const refundPolicy = getResource("claudecare://policies/refund-limits")
    console.log(`\n${refundPolicy.content}`)

    console.log("\nAttempting to read a non-existent resource:")
    const missing = getResource("claudecare://policies/nonexistent")
    console.log(JSON.stringify(missing, null, 2))

    // ── Part 3: With vs Without Resources ────────────────────────
    printDivider("PART 3: Agent With Resources vs Without Resources")

    console.log("\nBuilding system prompt WITH resources injected...")
    const systemWithResources = buildSystemPromptWithResources()
    console.log(`  System prompt length: ${systemWithResources.length} characters`)
    console.log(`  Policy content: included directly in context`)

    console.log("\nSystem prompt WITHOUT resources:")
    console.log(`  System prompt length: ${SYSTEM_PROMPT_NO_RESOURCES.length} characters`)
    console.log(`  Policy content: Claude must guess or call a tool`)

    console.log("\nTesting policy questions on both agent versions...\n")

    let withResourcesScore = 0
    let withoutResourcesScore = 0

    for (const test of POLICY_QUESTIONS) {
        console.log(`[${test.id}] "${test.question}"`)
        console.log(`  Correct: ${test.correct_answer}`)

        // Test WITH resources
        const withAnswer = await askPolicyQuestion(
            systemWithResources, test.question
        )
        const withCorrect = test.check(withAnswer)
        if (withCorrect) withResourcesScore++

        console.log(`\n  WITH resources:`)
        console.log(`    Answer:  "${withAnswer.slice(0, 120)}..."`)
        console.log(`    Correct: ${withCorrect ? "✅ YES" : "❌ NO"}`)

        await new Promise(r => setTimeout(r, 500))

        // Test WITHOUT resources
        const withoutAnswer = await askPolicyQuestion(
            SYSTEM_PROMPT_NO_RESOURCES, test.question
        )
        const withoutCorrect = test.check(withoutAnswer)
        if (withoutCorrect) withoutResourcesScore++

        console.log(`\n  WITHOUT resources:`)
        console.log(`    Answer:  "${withoutAnswer.slice(0, 120)}..."`)
        console.log(`    Correct: ${withoutCorrect ? "✅ YES" : "❌ NO (Claude guessed)"}`)
        console.log()

        await new Promise(r => setTimeout(r, 500))
    }

    // ── Summary ───────────────────────────────────────────────────
    printDivider("RESULTS")

    console.log(`
  With resources:    ${withResourcesScore}/${POLICY_QUESTIONS.length} correct
  Without resources: ${withoutResourcesScore}/${POLICY_QUESTIONS.length} correct

  With resources:    Claude reads exact policy values from context
  Without resources: Claude guesses from training data
                     (may hallucinate wrong PKR amounts or windows)
  `)

    printDivider("THE TOKEN COST ARGUMENT")

    const tokensPerToolCall = 150
    const ticketsPerDay = 1000
    const policyChecksPerTicket = 3

    const totalToolCallTokens = tokensPerToolCall *
        ticketsPerDay *
        policyChecksPerTicket

    console.log(`
  If policies were tools instead of resources:
    ${ticketsPerDay} tickets/day
    × ${policyChecksPerTicket} policy checks per ticket
    × ${tokensPerToolCall} tokens per tool call round-trip
    = ${totalToolCallTokens.toLocaleString()} tokens/day on policy lookups alone

  With resources (loaded once at session start):
    Policy checks cost 0 additional tokens
    Content is already in context
    Savings: ${totalToolCallTokens.toLocaleString()} tokens/day
  `)

    printDivider("WHEN TO USE RESOURCES vs TOOLS")

    console.log(`
  RESOURCES (stable reference, read once):
    ✅ Business policies (refund limits, return windows)
    ✅ Configuration values (thresholds, SLAs)
    ✅ Tier definitions (standard, premium, enterprise)
    ✅ Escalation criteria (what triggers human review)
    ✅ Anything needed on most requests

  TOOLS (live data, varies per request):
    ✅ Customer records (different per customer)
    ✅ Order details (specific to each order)
    ✅ Payment history (real-time transaction data)
    ✅ Actions that modify state (refunds, escalations)
    ✅ Anything that changes between requests
  `)
}

main().catch(console.error)