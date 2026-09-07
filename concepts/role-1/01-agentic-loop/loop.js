// loop.js
// The universal agentic loop.
// Swap the model. Swap the tools. The loop stays the same.

import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env" })

const client = new Anthropic()

/**
 * runAgent — the core agentic loop
 *
 * @param {string} goal          - What the agent needs to achieve
 * @param {Array}  tools         - Tool definitions (what model reads)
 * @param {Object} executors     - { tool_name: async function }
 * @param {Object} options       - { maxIterations, systemPrompt, verbose }
 * @returns {string}             - Final response from the model
 */
export async function runAgent(goal, tools, executors, options = {}) {
    const {
        maxIterations = 20,
        systemPrompt = "You are a helpful AI agent. Use tools to achieve the goal.",
        verbose = true
    } = options

    // The agent's working memory
    const messages = [
        { role: "user", content: goal }
    ]

    let iteration = 0

    // ── THE LOOP ──────────────────────────────────────────────────
    while (true) {
        iteration++

        if (iteration > maxIterations) {
            // Safety cap — never the primary stop condition
            console.error(`[Loop] Safety cap reached at ${maxIterations} iterations`)
            throw new Error(`Agent exceeded maximum iterations (${maxIterations})`)
        }

        if (verbose) {
            console.log(`\n[Loop] Iteration ${iteration} — sending ${messages.length} messages`)
        }

        // ── STEP 1: SEND ──────────────────────────────────────────
        const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: systemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            messages
        })

        if (verbose) {
            console.log(`[Loop] stop_reason: ${response.stop_reason}`)
        }

        // ── STEP 2: INSPECT ───────────────────────────────────────
        if (response.stop_reason === "end_turn") {
            // Agent is done — extract and return final text
            const finalText = response.content
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join("")

            if (verbose) {
                console.log(`[Loop] Complete after ${iteration} iteration(s)`)
                console.log(`[Loop] Final response: ${finalText.slice(0, 100)}...`)
            }

            return finalText
        }

        if (response.stop_reason === "tool_use") {
            // ── STEP 3: EXECUTE ─────────────────────────────────────
            const toolUseBlocks = response.content
                .filter(block => block.type === "tool_use")

            const toolResults = []

            for (const toolCall of toolUseBlocks) {
                const { id, name, input } = toolCall

                if (verbose) {
                    console.log(`[Loop] Tool call: ${name}`)
                    console.log(`[Loop] Arguments: ${JSON.stringify(input)}`)
                }

                let resultContent

                // Check if executor exists
                if (!executors[name]) {
                    resultContent = JSON.stringify({
                        isError: true,
                        errorCategory: "validation",
                        isRetryable: false,
                        description: `No executor found for tool: ${name}`
                    })
                } else {
                    try {
                        const result = await executors[name](input)
                        resultContent = JSON.stringify(result)

                        if (verbose) {
                            console.log(`[Loop] Tool result: ${resultContent.slice(0, 120)}`)
                        }
                    } catch (err) {
                        // Executor threw — return structured error, never crash the loop
                        resultContent = JSON.stringify({
                            isError: true,
                            errorCategory: "transient",
                            isRetryable: true,
                            description: `Tool execution error: ${err.message}`
                        })

                        if (verbose) {
                            console.log(`[Loop] Tool error caught: ${err.message}`)
                        }
                    }
                }

                toolResults.push({
                    type: "tool_result",
                    tool_use_id: id,         // must match the tool call id exactly
                    content: resultContent
                })
            }

            // ── STEP 4: APPEND ────────────────────────────────────────
            // Rule 1: assistant message first
            messages.push({
                role: "assistant",
                content: response.content
            })

            // Rule 2: tool results second
            messages.push({
                role: "user",
                content: toolResults
            })

            // Back to Step 1
            continue
        }

        // Unknown stop_reason — safe exit
        console.error(`[Loop] Unknown stop_reason: ${response.stop_reason}`)
        throw new Error(`Unexpected stop_reason: ${response.stop_reason}`)
    }
}