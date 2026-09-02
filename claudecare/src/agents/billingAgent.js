import { runAgent } from "../agent/loop.js";
import { runPreToolCall, runPostToolUse } from "../hooks/index.js";
import { toolDefinitions, toolExecutors } from "../mcp/tools/index.js";

const SYSTEM_PROMPT = `You are a billing dispute specialist for ClaudeCare. You investigate billing issues methodically. Always check both the invoice status and payment history before concluding.`;

const ALLOWED_TOOL_NAMES = [
  "get_customer",
  "get_invoice",
  "check_payment_history",
  "process_refund",
  "escalate_to_human",
];

const tools = toolDefinitions.filter((t) => ALLOWED_TOOL_NAMES.includes(t.name));

const rawExecutors = ALLOWED_TOOL_NAMES.reduce((acc, name) => {
  if (toolExecutors[name]) {
    acc[name] = toolExecutors[name];
  }
  return acc;
}, {});

/**
 * Wrap tool executors to integrate runPreToolCall and runPostToolUse lifecycle hooks.
 */
function createHookedExecutors(executors) {
  const hooked = {};
  for (const [toolName, executorFn] of Object.entries(executors)) {
    hooked[toolName] = async (toolArgs) => {
      // 1. Before calling tool: run runPreToolCall
      const guard = runPreToolCall(toolName, toolArgs);

      // 2. If blocked: return guard message directly without executing tool
      if (guard && guard.blocked) {
        return guard.message;
      }

      // 3. If not blocked: execute tool, then run runPostToolUse
      const rawResult = await executorFn(toolArgs);
      const rawJson = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
      return runPostToolUse(toolName, rawJson);
    };
  }
  return hooked;
}

const hookedExecutors = createHookedExecutors(rawExecutors);

/**
 * Runs the billing agent with customer context and returns structured dispute evaluation.
 *
 * @param {string} context - The customer and issue context string.
 * @returns {Promise<string>} Structured text result detailing refund status, rationale, and recommended action.
 */
export async function runBillingAgent(context, onToolResult) {
  const prompt = `${SYSTEM_PROMPT}\n\nCustomer & Issue Context:\n${context}`;
  return await runAgent(prompt, tools, hookedExecutors, onToolResult);
}
