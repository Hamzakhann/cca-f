// test-access-vs-empty.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import {
    definition,
    badExecutor,
    goodExecutor,
    emptyResultExecutor,
    setMode
} from "./tools/payment_history_tools.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// Run one turn of the agent and get Claude's conclusion
async function runOneAgentTurn(executor, userMessage, mode = "normal") {
    setMode(mode)

    // Turn 1: Claude decides to call the tool
    const response1 = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: `You are a ClaudeCare billing investigator.
Your job: investigate whether a customer has a duplicate charge.
After calling the tool, clearly state ONE of:
  A) "DUPLICATE FOUND: [details]"
  B) "NO DUPLICATE: customer has no payment history"
  C) "CANNOT VERIFY: [reason]"
Be precise about which conclusion you reach.`,
        tools: [definition],
        messages: [{ role: "user", content: userMessage }]
    })

    const toolUse = response1.content.find(b => b.type === "tool_use")
    if (!toolUse) return { conclusion: "NO_TOOL_CALLED", raw: "" }

    // Execute the tool with the current mode
    const toolResult = await executor(toolUse.input)

    // Turn 2: Claude receives result and draws conclusion
    const messages = [
        { role: "user", content: userMessage },
        { role: "assistant", content: response1.content },
        {
            role: "user",
            content: [{
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify(toolResult)
            }]
        }
    ]

    const response2 = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: `You are a ClaudeCare billing investigator.
Your job: investigate whether a customer has a duplicate charge.
After calling the tool, clearly state ONE of:
  A) "DUPLICATE FOUND: [details]"
  B) "NO DUPLICATE: customer has no payment history"
  C) "CANNOT VERIFY: [reason]"
Be precise about which conclusion you reach.`,
        tools: [definition],
        messages
    })

    const text = response2.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("")

    // Classify Claude's conclusion
    const textLower = text.toLowerCase()
    let conclusion = "UNCLEAR"
    if (textLower.includes("duplicate found") ||
        textLower.includes("duplicate charge") ||
        (textLower.includes("pay-8001") || textLower.includes("pay-8002"))) {
        conclusion = "DUPLICATE_FOUND"
    } else if (textLower.includes("no duplicate") ||
        textLower.includes("no payment history") ||
        textLower.includes("no payments") ||
        textLower.includes("no records")) {
        conclusion = "NO_DUPLICATE"
    } else if (textLower.includes("cannot verify") ||
        textLower.includes("unable to verify") ||
        textLower.includes("could not") ||
        textLower.includes("retry") ||
        textLower.includes("timed out") ||
        textLower.includes("unavailable") ||
        textLower.includes("error")) {
        conclusion = "CANNOT_VERIFY"
    }

    return {
        conclusion,
        tool_result: toolResult,
        raw: text.slice(0, 300)
    }
}

async function main() {
    console.log("ACCESS FAILURE VS VALID EMPTY RESULT TEST")
    console.log("Proving: silent access failures cause wrong conclusions\n")

    const userMessage = "Customer C-1001 claims they were charged twice. Investigate."

    // ── TEST 1: Database timeout — BAD executor ────────────────────
    console.log("=".repeat(60))
    console.log("TEST 1: Database timeout → BAD executor (hides failure)")
    console.log("=".repeat(60))
    console.log("What happens: database times out, bad executor returns []")
    console.log("Expected Claude conclusion: NO_DUPLICATE (wrong — silent bug)")
    console.log()

    const bad = await runOneAgentTurn(badExecutor, userMessage, "timeout")
    console.log(`Tool returned: ${JSON.stringify(bad.tool_result)}`)
    console.log(`Claude concluded: ${bad.conclusion}`)
    console.log(`Claude said: "${bad.raw.slice(0, 200)}"`)

    const badIsWrong = bad.conclusion === "NO_DUPLICATE"
    console.log(`\n${badIsWrong ? "❌ CONFIRMED BUG" : "⚠️  Unexpected"}: ` +
        `Claude ${badIsWrong
            ? "wrongly concluded no duplicate — silent failure hid the real data"
            : `said: ${bad.conclusion}`}`)

    await new Promise(r => setTimeout(r, 1000))

    // ── TEST 2: Database timeout — GOOD executor ───────────────────
    console.log("\n" + "=".repeat(60))
    console.log("TEST 2: Database timeout → GOOD executor (explicit error)")
    console.log("=".repeat(60))
    console.log("What happens: database times out, good executor returns isError: true")
    console.log("Expected Claude conclusion: CANNOT_VERIFY (correct)")
    console.log()

    const good = await runOneAgentTurn(goodExecutor, userMessage, "timeout")
    console.log(`Tool returned: ${JSON.stringify(good.tool_result).slice(0, 120)}...`)
    console.log(`Claude concluded: ${good.conclusion}`)
    console.log(`Claude said: "${good.raw.slice(0, 200)}"`)

    const goodIsRight = good.conclusion === "CANNOT_VERIFY"
    console.log(`\n${goodIsRight ? "✅ CORRECT" : "❌ Unexpected"}: ` +
        `Claude ${goodIsRight
            ? "correctly said it cannot verify — will retry or escalate"
            : `said: ${good.conclusion}`}`)

    await new Promise(r => setTimeout(r, 1000))

    // ── TEST 3: Valid empty result ─────────────────────────────────
    console.log("\n" + "=".repeat(60))
    console.log("TEST 3: Valid empty result — C-1002 has no payment history")
    console.log("=".repeat(60))
    console.log("What happens: database works, C-1002 genuinely has no payments")
    console.log("Expected Claude conclusion: NO_DUPLICATE (correct — real finding)")
    console.log()

    const emptyMessage = "Customer C-1002 claims they were charged twice. Investigate."
    const empty = await runOneAgentTurn(emptyResultExecutor, emptyMessage, "normal")
    console.log(`Tool returned: ${JSON.stringify(empty.tool_result)}`)
    console.log(`Claude concluded: ${empty.conclusion}`)
    console.log(`Claude said: "${empty.raw.slice(0, 200)}"`)

    const emptyIsRight = empty.conclusion === "NO_DUPLICATE"
    console.log(`\n${emptyIsRight ? "✅ CORRECT" : "❌ Unexpected"}: ` +
        `Claude ${emptyIsRight
            ? "correctly concluded no duplicate — data source confirmed no records"
            : `said: ${empty.conclusion}`}`)

    // ── SUMMARY ───────────────────────────────────────────────────
    console.log("\n" + "=".repeat(60))
    console.log("WHAT THESE THREE TESTS PROVE")
    console.log("=".repeat(60))
    console.log(`
Test 1 — BAD executor on timeout:
  Tool returned: { payments: [] }    ← looks like valid data
  Claude concluded: NO_DUPLICATE     ← WRONG
  Customer impact: refund denied     ← REAL HARM
  Error visibility: NONE             ← SILENT BUG

Test 2 — GOOD executor on timeout:
  Tool returned: { isError: true, errorCategory: "transient" }
  Claude concluded: CANNOT_VERIFY    ← CORRECT
  Customer impact: retry attempted   ← PROTECTED
  Error visibility: EXPLICIT         ← DEBUGGABLE

Test 3 — Valid empty result:
  Tool returned: { payments: [] }    ← same structure as Test 1
  Claude concluded: NO_DUPLICATE     ← CORRECT (this time)
  Customer impact: accurate finding  ← HONEST RESPONSE
  Error visibility: N/A              ← NO ERROR OCCURRED

THE KEY INSIGHT:
  { payments: [] } means TWO completely different things:
    In Test 1: "we couldn't check" (but looks like "no payments")
    In Test 3: "we checked and confirmed no payments"

  Only isError: true distinguishes them.
  Without it — silent financial errors.
`)

    console.log("=".repeat(60))
    console.log("THE RULE — NEVER FORGET THIS")
    console.log("=".repeat(60))
    console.log(`
  try {
    const data = await database.query(...)
    return data  // ← valid result (including empty arrays)
  } catch (err) {
    return {     // ← ALWAYS structured error in catch
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Cannot reach data source — do not interpret as empty"
    }
  }

  INSIDE try  → valid result  → empty array is honest
  INSIDE catch → access failure → NEVER return empty array
`)
}

main().catch(console.error)