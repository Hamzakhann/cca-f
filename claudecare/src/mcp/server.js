import { toolDefinitions, toolExecutors } from "./tools/index.js";

/**
 * ClaudeCare MCP Tool Registry export.
 */
export const toolRegistry = {
  definitions: toolDefinitions,
  executors: toolExecutors,
};

const toolNames = toolDefinitions.map((t) => t.name).join(", ");
console.log(`ClaudeCare MCP server started. Available tools (${toolDefinitions.length}): [${toolNames}]`);
