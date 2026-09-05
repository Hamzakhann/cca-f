// demonstrate-discovery.js
// Simulates what happens at connection time with multiple servers.
// Shows tool availability, addition of new tools, and server failure.

import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// ── Simulate three MCP servers with their tools ────────────────────
// In reality these come from separate server processes.
// Here we simulate them as in-memory tool registries.

const SERVER_REGISTRY = {
  "claudecare-tools": {
    status: "online",
    tools: [
      {
        name: "get_customer",
        description: `Retrieves customer account profile by customer ID.
Returns: customer_id, name, account_status, account_tier, currency (PKR).
Use when: verifying customer identity or checking account status.
Do NOT use for: orders (use lookup_order), payments (use check_payment_history).
Example: { customer_id: 'C-1001' }`,
        input_schema: {
          type: "object",
          properties: {
            customer_id: { type: "string", description: "Format: C-XXXX" }
          },
          required: ["customer_id"]
        }
      },
      {
        name: "process_refund",
        description: `Executes an automated refund. ACTION TOOL — modifies records.
Returns: success, refund_id, amount (PKR), estimated_processing_days.
Use when: duplicate charge confirmed, amount within PKR 50,000 limit.
Do NOT use for: amounts above PKR 50,000 (use escalate_to_human).
Example: { customer_id: 'C-1001', amount: 12500, reason: 'Duplicate PAY-8002' }`,
        input_schema: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            amount: { type: "number" },
            reason: { type: "string" }
          },
          required: ["customer_id", "amount", "reason"]
        }
      }
    ]
  },

  "database-tools": {
    status: "online",
    tools: [
      {
        name: "query_audit_log",
        description: `Queries the system audit log for a customer's action history.
Returns: customer_id, events (array of: timestamp, action, agent, result).
Use when: investigating account activity, reviewing agent actions on account.
Do NOT use for: payment records (use check_payment_history).
Example: { customer_id: 'C-1001', limit: 10 }`,
        input_schema: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            limit: { type: "number", description: "Max events to return. Default 10." }
          },
          required: ["customer_id"]
        }
      },
      {
        name: "get_system_health",
        description: `Returns current system health status for all services.
Returns: services (array of: name, status, latency_ms, last_checked).
Use when: investigating service availability, checking if a timeout is systemic.
Do NOT use for: customer-specific data.
Example: {}`,
        input_schema: {
          type: "object",
          properties: {}
        }
      }
    ]
  },

  "notification-tools": {
    status: "online",
    tools: [
      {
        name: "send_resolution_email",
        description: `Sends a resolution confirmation email to a customer.
Returns: sent (boolean), message_id, delivered_at (ISO 8601).
Use when: a support case is fully resolved and customer needs confirmation.
Do NOT use for: sending mid-investigation updates.
Example: { customer_id: 'C-1001', resolution_summary: 'Refund PKR 12,500 processed' }`,
        input_schema: {
          type: "object",
          properties: {
            customer_id: { type: "string" },
            resolution_summary: { type: "string" }
          },
          required: ["customer_id", "resolution_summary"]
        }
      }
    ]
  }
}

// ── Simulate connection time ───────────────────────────────────────
function connectAndDiscover(registry) {
  console.log("\nConnecting to MCP servers...")
  const allTools = []
  const connectionReport = []

  for (const [serverName, server] of Object.entries(registry)) {
    if (server.status === "online") {
      allTools.push(...server.tools)
      connectionReport.push({
        server: serverName,
        status: "connected",
        toolsDiscovered: server.tools.length,
        toolNames: server.tools.map(t => t.name)
      })
      console.log(`  ✅ ${serverName}: connected, ${server.tools.length} tools discovered`)
    } else {
      connectionReport.push({
        server: serverName,
        status: "failed",
        toolsDiscovered: 0,
        toolNames: []
      })
      console.log(`  ❌ ${serverName}: connection failed — 0 tools loaded`)
    }
  }

  console.log(`\n  Total tools available this session: ${allTools.length}`)
  return { allTools, connectionReport }
}

// ── Simple executor for demo ──────────────────────────────────────
function executeToolCall(toolName, input) {
  const mockResults = {
    get_customer: {
      customer_id: input.customer_id,
      name: "Ahmed Ali",
      account_status: "active",
      account_tier: "premium",
      currency: "PKR"
    },
    process_refund: {
      success: true,
      refund_id: "REF-" + Math.floor(Math.random() * 900 + 100),
      amount: input.amount,
      currency: "PKR",
      estimated_processing_days: 5
    },
    query_audit_log: {
      customer_id: input.customer_id,
      events: [
        { timestamp: "2026-08-24T10:00:00Z", action: "login", agent: "system" },
        { timestamp: "2026-08-24T10:05:00Z", action: "view_invoice", agent: "support-bot" }
      ]
    },
    get_system_health: {
      services: [
        { name: "customer-db", status: "healthy", latency_ms: 12 },
        { name: "payment-db",  status: "healthy", latency_ms: 8 },
        { name: "email-svc",   status: "healthy", latency_ms: 45 }
      ]
    },
    send_resolution_email: {
      sent: true,
      message_id: "msg-" + Math.floor(Math.random() * 9000 + 1000),
      delivered_at: new Date().toISOString()
    }
  }
  return mockResults[toolName] || { error: "unknown tool" }
}

// ── Run one agentic turn ─────────────────────────────────────────
async function runAgentTurn(tools, userMessage) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `You are a ClaudeCare support agent.
Use available tools to help the customer.
Tools come from multiple servers but you select based on descriptions alone.`,
    tools,
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: userMessage }]
  })

  const toolUse = response.content.find(b => b.type === "tool_use")
  return toolUse ? { tool: toolUse.name, input: toolUse.input } : null
}

function printDivider(title) {
  console.log("\n" + "=".repeat(58))
  console.log(title)
  console.log("=".repeat(58))
}

async function main() {
  console.log("TOOL DISCOVERY AT CONNECTION TIME — DEMONSTRATION")
  console.log("Proving: all tools available from turn 1, across all servers\n")

  // ── SCENARIO 1: Normal connection — all servers online ────────
  printDivider("SCENARIO 1: Normal Connection — All Servers Online")

  const { allTools, connectionReport } = connectAndDiscover(SERVER_REGISTRY)

  console.log("\nAll discovered tools (from ALL servers combined):")
  allTools.forEach((t, i) => {
    const server = connectionReport.find(r => r.toolNames.includes(t.name))
    console.log(`  ${i + 1}. ${t.name.padEnd(25)} ← from ${server?.server}`)
  })

  console.log("\nClaude sees ALL tools simultaneously.")
  console.log("It does not know or care which server each tool came from.")
  console.log("It selects based on descriptions alone.\n")

  // Test: Claude picks tools from different servers correctly
  const testCases = [
    {
      message: "Get account profile for customer C-1001.",
      expectedServer: "claudecare-tools"
    },
    {
      message: "Check the system health — are all services running?",
      expectedServer: "database-tools"
    },
    {
      message: "Send a resolution email to C-1001: Refund PKR 12,500 processed.",
      expectedServer: "notification-tools"
    }
  ]

  console.log("Testing: Claude selects correctly across all servers")
  console.log("-".repeat(58))

  for (const { message, expectedServer } of testCases) {
    const result = await runAgentTurn(allTools, message)
    if (result) {
      const toolServer = connectionReport.find(r =>
        r.toolNames.includes(result.tool)
      )
      const correct = toolServer?.server === expectedServer
      console.log(`\nQuery: "${message.slice(0, 50)}..."`)
      console.log(`  Tool selected: ${result.tool}`)
      console.log(`  From server:   ${toolServer?.server}`)
      console.log(`  Expected:      ${expectedServer}`)
      console.log(`  Result:        ${correct ? "✅ CORRECT" : "❌ WRONG"}`)
    }
    await new Promise(r => setTimeout(r, 600))
  }

  // ── SCENARIO 2: New tool added — NOT visible in current session
  printDivider("SCENARIO 2: New Tool Added During Session")

  console.log(`
Simulating: developer adds 'get_invoice_v2' to claudecare-tools server
            while the session is already running.
  `)

  const newTool = {
    name: "get_invoice_v2",
    description: `Enhanced invoice retrieval with payment breakdown.
Returns: invoice_id, amount, payment_count, payment_breakdown array.
Use when: investigating duplicate charges with detailed payment analysis.
Example: { invoice_id: 'INV-1001' }`,
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string" }
      },
      required: ["invoice_id"]
    }
  }

  // Add to server registry (simulating server-side addition)
  SERVER_REGISTRY["claudecare-tools"].tools.push(newTool)
  console.log("✅ get_invoice_v2 added to claudecare-tools server")

  // But current session's allTools does NOT include it
  console.log(`\nTools in CURRENT session: ${allTools.length}`)
  console.log(`get_invoice_v2 in session: ${allTools.some(t => t.name === "get_invoice_v2") ? "YES" : "NO ← not discovered yet"}`)

  console.log(`
Why: connection time already passed.
     The session connected BEFORE get_invoice_v2 existed.
     Discovery is a one-time event at session start.

Fix: restart Claude Code to start a new session.
  `)

  // Simulate new session (re-connect)
  console.log("Simulating: developer restarts Claude Code (new session)...")
  const { allTools: newSessionTools } = connectAndDiscover(SERVER_REGISTRY)
  console.log(`\nTools in NEW session: ${newSessionTools.length}`)
  console.log(`get_invoice_v2 in new session: ${newSessionTools.some(t => t.name === "get_invoice_v2") ? "YES ✅" : "NO ❌"}`)

  // ── SCENARIO 3: Server failure at connection time ──────────────
  printDivider("SCENARIO 3: Server Failure at Connection Time")

  // Take database-tools offline
  const degradedRegistry = {
    ...SERVER_REGISTRY,
    "database-tools": {
      ...SERVER_REGISTRY["database-tools"],
      status: "offline"
    }
  }

  console.log("\nSimulating: database-tools server is down when session starts")
  const { allTools: degradedTools } = connectAndDiscover(degradedRegistry)

  console.log(`\nAvailable tools with database-tools offline:`)
  degradedTools.forEach(t => console.log(`  ✅ ${t.name}`))

  const missingTools = SERVER_REGISTRY["database-tools"].tools
  console.log(`\nUnavailable tools (server was offline at connection time):`)
  missingTools.forEach(t => console.log(`  ❌ ${t.name}`))

  console.log(`
Impact: any query needing query_audit_log or get_system_health
        will fail — those tools were never loaded.

Fix: start the database-tools server, then restart Claude Code.
     Restarting Claude Code alone is not enough if the server
     is still offline — connection at startup will fail again.
  `)

  // ── Final summary ─────────────────────────────────────────────
  printDivider("THE THREE RULES OF TOOL DISCOVERY")

  console.log(`
  Rule 1: Discovery happens ONCE — at session start
          All tools from all servers loaded simultaneously.
          Claude never re-discovers tools mid-session.

  Rule 2: New tool added? Restart Claude Code.
          The current session cannot see tools that did not exist
          when it connected. Restart = new connection = new discovery.

  Rule 3: Server offline at startup? Those tools are gone for the session.
          Fix the server AND restart Claude Code.
          Restarting only Claude Code won't help if server is still down.
  `)
}

main().catch(console.error)