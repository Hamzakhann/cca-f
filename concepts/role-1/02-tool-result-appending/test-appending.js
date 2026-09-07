// test-appending.js
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import { validateMessages } from "./validate-messages.js"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

// Simple tool for testing
const TOOLS = [
    {
        name: "get_weather",
        description: `Gets current weather for a city.
Returns: city, temperature_celsius, condition, humidity_percent.
Use when: user asks about weather in a specific city.
Example: { city: "Karachi" }`,
        input_schema: {
            type: "object",
            properties: {
                city: { type: "string", description: "City name" }
            },
            required: ["city"]
        }
    },
    {
        name: "get_forecast",
        description: `Gets 3-day weather forecast for a city.
Returns: city, forecast (array of: day, high_celsius, low_celsius, condition).
Use when: user asks about upcoming weather.
Example: { city: "Lahore" }`,
        input_schema: {
            type: "object",
            properties: {
                city: { type: "string" }
            },
            required: ["city"]
        }
    }
]

const EXECUTORS = {
    get_weather: async ({ city }) => ({
        city,
        temperature_celsius: 34,
        condition: "Sunny",
        humidity_percent: 65
    }),
    get_forecast: async ({ city }) => ({
        city,
        forecast: [
            { day: "Tomorrow", high_celsius: 35, low_celsius: 26, condition: "Sunny" },
            { day: "Day 2", high_celsius: 33, low_celsius: 25, condition: "Cloudy" },
            { day: "Day 3", high_celsius: 31, low_celsius: 24, condition: "Rain" }
        ]
    })
}

function printDivider(title) {
    console.log("\n" + "=".repeat(55))
    console.log(title)
    console.log("=".repeat(55))
}

// ── CORRECT appending with validation ─────────────────────────────
async function runWithValidation(goal) {
    const messages = [{ role: "user", content: goal }]
    let iteration = 0

    while (true) {
        iteration++

        const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            tools: TOOLS,
            messages
        })

        console.log(`\nIteration ${iteration} | stop_reason: ${response.stop_reason}`)

        if (response.stop_reason === "end_turn") {
            console.log("Loop complete.")
            return response.content
                .filter(b => b.type === "text")
                .map(b => b.text)
                .join("")
        }

        if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content
                .filter(b => b.type === "tool_use")

            console.log(`Tool calls: ${toolUseBlocks.map(t => t.name).join(", ")}`)

            // Execute all tools
            const toolResults = []
            for (const toolCall of toolUseBlocks) {
                const result = await EXECUTORS[toolCall.name](toolCall.input)
                console.log(`  ${toolCall.name} → ${JSON.stringify(result).slice(0, 60)}`)

                toolResults.push({
                    type: "tool_result",
                    tool_use_id: toolCall.id,          // ← exact match
                    content: JSON.stringify(result) // ← always a string
                })
            }

            // ── CORRECT ORDER ──
            messages.push({ role: "assistant", content: response.content })
            messages.push({ role: "user", content: toolResults })

            // Validate structure after every append
            const validation = validateMessages(messages)
            if (!validation.valid) {
                console.error("INVALID MESSAGES ARRAY:")
                validation.errors.forEach(e => console.error("  ❌", e))
                throw new Error("Message structure invalid")
            } else {
                console.log(`  Messages valid ✅ (${messages.length} messages in array)`)
            }
        }
    }
}

async function main() {
    console.log("TOOL RESULT APPENDING TEST")
    console.log("Proving: correct message structure is mandatory\n")

    // ── Test 1: Single tool call ───────────────────────────────────
    printDivider("TEST 1: Single Tool Call Appending")

    const result1 = await runWithValidation(
        "What is the weather in Karachi right now?"
    )
    console.log(`\nFinal: ${result1}`)

    await new Promise(r => setTimeout(r, 800))

    // ── Test 2: Multiple tool calls in one turn ────────────────────
    printDivider("TEST 2: Multiple Tool Calls in One Turn")

    const result2 = await runWithValidation(
        "Get both the current weather AND the 3-day forecast for Lahore."
    )
    console.log(`\nFinal: ${result2}`)

    await new Promise(r => setTimeout(r, 800))

    // ── Test 3: Demonstrate the 4 rules with wrong structures ──────
    printDivider("TEST 3: Validate Wrong Message Structures")

    const wrongStructures = [
        {
            label: "Rule 1 violated — tool result before assistant message",
            messages: [
                { role: "user", content: "What is the weather?" },
                // MISSING assistant message with tool_use
                {
                    role: "user", content: [
                        {
                            type: "tool_result", tool_use_id: "tu_001",
                            content: JSON.stringify({ temp: 34 })
                        }
                    ]
                }
            ]
        },
        {
            label: "Rule 2 violated — wrong tool_use_id",
            messages: [
                { role: "user", content: "What is the weather?" },
                {
                    role: "assistant", content: [
                        {
                            type: "tool_use", id: "tu_001", name: "get_weather",
                            input: { city: "Karachi" }
                        }
                    ]
                },
                {
                    role: "user", content: [
                        {
                            type: "tool_result",
                            tool_use_id: "tu_WRONG", // ← wrong id
                            content: JSON.stringify({ temp: 34 })
                        }
                    ]
                }
            ]
        },
        {
            label: "Rule 3 violated — object instead of string",
            messages: [
                { role: "user", content: "What is the weather?" },
                {
                    role: "assistant", content: [
                        {
                            type: "tool_use", id: "tu_001", name: "get_weather",
                            input: { city: "Karachi" }
                        }
                    ]
                },
                {
                    role: "user", content: [
                        {
                            type: "tool_result",
                            tool_use_id: "tu_001",
                            content: { temp: 34 }  // ← object, not string
                        }
                    ]
                }
            ]
        },
        {
            label: "Correct structure — all 4 rules followed",
            messages: [
                { role: "user", content: "What is the weather?" },
                {
                    role: "assistant", content: [
                        {
                            type: "tool_use", id: "tu_001", name: "get_weather",
                            input: { city: "Karachi" }
                        }
                    ]
                },
                {
                    role: "user", content: [
                        {
                            type: "tool_result",
                            tool_use_id: "tu_001",         // ← matches exactly
                            content: JSON.stringify({ temp: 34 }) // ← is a string
                        }
                    ]
                }
            ]
        }
    ]

    for (const { label, messages } of wrongStructures) {
        const validation = validateMessages(messages)
        console.log(`\n${label}`)
        if (validation.valid) {
            console.log("  ✅ Valid")
        } else {
            validation.errors.forEach(e => console.log(`  ❌ ${e}`))
        }
    }

    // ── Summary ────────────────────────────────────────────────────
    printDivider("THE 4 RULES — NEVER FORGET")
    console.log(`
  Rule 1: Assistant message BEFORE tool result — always
          messages.push(assistant)  ← first
          messages.push(toolResult) ← second

  Rule 2: tool_use_id MUST match tool call id exactly
          tool_result.tool_use_id === tool_use.id

  Rule 3: content MUST be a string
          content: JSON.stringify(result)  ← not result directly

  Rule 4: All results appended before next API call
          Execute ALL tool calls, collect ALL results,
          then push assistant + results together
  `)
}

main().catch(console.error)