// validate-messages.js
// Validates message arrays for correctness before sending to API.
// Use this in development to catch structure errors early.

/**
 * Validates a messages array for agentic loop correctness.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export function validateMessages(messages) {
    const errors = []

    // Rule: must start with a user message
    if (messages[0]?.role !== "user") {
        errors.push("First message must be role: user")
    }

    // Walk through messages and validate structure
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        const pos = `messages[${i}]`

        // Rule: role must be user or assistant
        if (!["user", "assistant"].includes(msg.role)) {
            errors.push(`${pos}: invalid role "${msg.role}"`)
        }

        // Rule: content must exist
        if (!msg.content) {
            errors.push(`${pos}: missing content`)
            continue
        }

        // For assistant messages with tool_use blocks
        if (msg.role === "assistant" && Array.isArray(msg.content)) {
            const toolUseBlocks = msg.content.filter(b => b.type === "tool_use")

            for (const toolUse of toolUseBlocks) {
                // Rule: tool_use must have an id
                if (!toolUse.id) {
                    errors.push(`${pos}: tool_use block missing id`)
                }

                // Rule: the next message must be a user message with tool_results
                const nextMsg = messages[i + 1]
                if (!nextMsg) {
                    errors.push(`${pos}: tool_use block has no following tool_result message`)
                    continue
                }
                if (nextMsg.role !== "user") {
                    errors.push(`${pos}: message after tool_use must be role: user`)
                }

                // Rule: tool_result must reference this tool_use id
                const toolResults = Array.isArray(nextMsg.content)
                    ? nextMsg.content.filter(b => b.type === "tool_result")
                    : []
                const matchingResult = toolResults.find(r => r.tool_use_id === toolUse.id)

                if (!matchingResult) {
                    errors.push(
                        `${pos}: no tool_result found with tool_use_id "${toolUse.id}"`
                    )
                }
            }
        }

        // For user messages with tool_result blocks
        if (msg.role === "user" && Array.isArray(msg.content)) {
            const toolResultBlocks = msg.content.filter(b => b.type === "tool_result")

            for (const result of toolResultBlocks) {
                // Rule: content must be a string
                if (typeof result.content !== "string") {
                    errors.push(
                        `${pos}: tool_result content must be a string. ` +
                        `Got: ${typeof result.content}. Use JSON.stringify().`
                    )
                }

                // Rule: tool_use_id must exist
                if (!result.tool_use_id) {
                    errors.push(`${pos}: tool_result missing tool_use_id`)
                }

                // Rule: preceding message must be assistant with matching tool_use
                const prevMsg = messages[i - 1]
                if (!prevMsg || prevMsg.role !== "assistant") {
                    errors.push(
                        `${pos}: tool_result must be preceded by an assistant message`
                    )
                }
            }
        }
    }

    return errors.length === 0
        ? { valid: true }
        : { valid: false, errors }
}