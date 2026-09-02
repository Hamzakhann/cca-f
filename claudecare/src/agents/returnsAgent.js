import { runAgent } from "../agent/loop.js";
import { toolDefinitions, toolExecutors } from "../mcp/tools/index.js";

const SYSTEM_PROMPT = `You are a returns specialist for ClaudeCare. You determine return eligibility based on purchase date and policy. Always verify the order details using lookup_order before checking eligibility.`;

const ALLOWED_TOOL_NAMES = [
  "get_customer",
  "lookup_order",
  "check_return_eligibility",
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
 * Runs the returns agent with order and customer context and returns structured eligibility evaluation.
 *
 * @param {string} context - The customer return request context string.
 * @returns {Promise<string>} Structured text result detailing return eligibility, reason, and recommended action.
 */
export async function runReturnsAgent(context, onToolResult) {
  const prompt = `${SYSTEM_PROMPT}\n\nCustomer & Return Context:\n${context}`;
  return await runAgent(prompt, tools, filteredExecutors, onToolResult);
}
