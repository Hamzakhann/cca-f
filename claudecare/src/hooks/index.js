import { normalizeToolResult } from "./normalizer.js";
import { guardRefund } from "./refundGuard.js";

/**
 * Pre-Tool Execution Hook: Runs guard checks before a tool executes.
 *
 * @param {string} toolName - Name of the tool being called.
 * @param {Object} toolArgs - Arguments passed to the tool.
 * @returns {Object} Guard status object { blocked: boolean, redirectTo?: string, message?: string }
 */
export function runPreToolCall(toolName, toolArgs) {
  return guardRefund(toolName, toolArgs);
}

/**
 * Post-Tool Execution Hook: Normalizes tool results after execution.
 *
 * @param {string} toolName - Name of the tool executed.
 * @param {string} rawResult - Raw tool output as a JSON string.
 * @returns {string} Transformed normalized JSON string.
 */
export function runPostToolUse(toolName, rawResult) {
  return normalizeToolResult(toolName, rawResult);
}
