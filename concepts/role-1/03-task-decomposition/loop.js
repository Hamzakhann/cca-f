// loop.js — reuse from Concept 1
import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env" })

export const client = new Anthropic()

export async function runAgent(goal, tools, executors, options = {}) {
    const { maxIterations = 15, systemPrompt = "You are a helpful AI agent.", verbose = true } = options
    const messages = [{ role: "user", content: goal }]
    let iteration = 0

    while (true) {
        iteration++
        if (iteration > maxIterations) throw new Error("Max iterations reached")

        const response = await client.messages.create({
            model: "claude-sonnet-4-6", max_tokens: 1024,
            system: systemPrompt,
            tools: tools.length > 0 ? tools : undefined,
            messages
        })

        if (verbose) console.log(`[Loop] Iteration ${iteration} | stop_reason: ${response.stop_reason}`)
        if (response.stop_reason === "end_turn") {
            return response.content.filter(b => b.type === "text").map(b => b.text).join("")
        }

        const toolUseBlocks = response.content.filter(b => b.type === "tool_use")
        const toolResults = []

        for (const toolCall of toolUseBlocks) {
            if (verbose) console.log(`[Loop] Tool: ${toolCall.name} | args: ${JSON.stringify(toolCall.input)}`)
            try {
                const result = await executors[toolCall.name](toolCall.input)
                if (verbose) console.log(`[Loop] Result: ${JSON.stringify(result).slice(0, 80)}`)
                toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: JSON.stringify(result) })
            } catch (err) {
                toolResults.push({
                    type: "tool_result", tool_use_id: toolCall.id,
                    content: JSON.stringify({ isError: true, errorCategory: "transient", isRetryable: true, description: err.message })
                })
            }
        }

        messages.push({ role: "assistant", content: response.content })
        messages.push({ role: "user", content: toolResults })
    }
}