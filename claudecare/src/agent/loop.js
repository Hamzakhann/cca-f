import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Anthropic();

/**
 * Runs an agent loop using Anthropic Claude SDK.
 *
 * @param {string} userMessage - The initial prompt from the user.
 * @param {Array} tools - Array of Anthropic tool definitions (name, description, input_schema).
 * @param {Object} toolExecutors - Object mapping tool name -> async function.
 * @returns {Promise<string>} The final text output from the assistant.
 */
export async function runAgent(userMessage, tools, toolExecutors, onToolResult) {
  const messages = [{ role: "user", content: userMessage }];
  let iteration = 1;

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: tools,
      messages: messages,
    });

    console.log(
      "Tokens used this turn:",
      response.usage.input_tokens,
      "input,",
      response.usage.output_tokens,
      "output"
    );

    const stop_reason = response.stop_reason;
    console.log(`Iteration ${iteration} | stop_reason: ${stop_reason}`);

    if (stop_reason === "end_turn") {
      const finalText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      console.log(finalText);
      return finalText;
    } else if (stop_reason === "tool_use") {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const { name, input, id } = block;
          console.log(`Tool call: ${name} | args: ${JSON.stringify(input)}`);

          const executor = toolExecutors[name];
          if (!executor) {
            throw new Error(`No executor provided for tool: ${name}`);
          }

          const result = await executor(input);
          if (onToolResult) {
            try {
              const parsed = typeof result === "string" ? JSON.parse(result) : result;
              onToolResult(name, parsed);
            } catch {
              onToolResult(name, result);
            }
          }
          const jsonResult = typeof result === "string" ? result : JSON.stringify(result);
          console.log(`Tool result: ${jsonResult}`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: id,
            content: jsonResult,
          });
        }
      }

      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    } else {
      throw new Error(`Unexpected stop_reason: ${stop_reason}`);
    }

    iteration++;
  }
}
