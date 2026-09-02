import { runAgent } from "../agent/loop.js";
import { toolDefinitions, toolExecutors } from "../mcp/tools/index.js";

const SYSTEM_PROMPT = `You are a technical support specialist for ClaudeCare. You diagnose software integration errors, API authentication failures, SDK configuration issues, and system degradation. Always check customer context and inspect relevant system error logs or API status before concluding.`;

const ALLOWED_TOOL_NAMES = [
  "get_customer",
  "check_api_status",
  "get_error_logs",
  "escalate_to_human",
];

const tools = toolDefinitions.filter((t) => ALLOWED_TOOL_NAMES.includes(t.name));

const filteredExecutors = ALLOWED_TOOL_NAMES.reduce((acc, name) => {
  if (toolExecutors[name]) {
    acc[name] = toolExecutors[name];
  }
  return acc;
}, {});

/**
 * Runs the technical support agent with customer and technical inquiry context.
 *
 * @param {string} context - The customer technical issue context string.
 * @returns {Promise<string>} Structured text result detailing diagnostic findings, root cause, and recommended action.
 */
export async function runTechnicalSupportAgent(context, onToolResult) {
  const prompt = `${SYSTEM_PROMPT}\n\nTechnical Issue Context:\n${context}`;
  return await runAgent(prompt, tools, filteredExecutors, onToolResult);
}
