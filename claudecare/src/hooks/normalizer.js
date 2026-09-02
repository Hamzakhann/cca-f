const ALLOWED_TOOLS = new Set(["get_invoice", "check_payment_history"]);

const STATUS_MAP = {
  1: "active",
  2: "suspended",
  3: "closed",
};

/**
 * Transforms fields recursively inside parsed tool results.
 */
function transformObject(obj, toolName) {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformObject(item, toolName));
  }

  if (obj !== null && typeof obj === "object") {
    const transformed = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (typeof value === "number" && (lowerKey.includes("date") || lowerKey.includes("timestamp"))) {
        const isoDate = new Date(value * 1000).toISOString().split("T")[0];
        console.log(`[normalizer] Tool '${toolName}': field '${key}' changed (${value} -> "${isoDate}")`);
        transformed[key] = isoDate;
      } else if (key === "status" && typeof value === "number" && STATUS_MAP[value] !== undefined) {
        const newStatus = STATUS_MAP[value];
        console.log(`[normalizer] Tool '${toolName}': field '${key}' changed (${value} -> "${newStatus}")`);
        transformed[key] = newStatus;
      } else if (value !== null && typeof value === "object") {
        transformed[key] = transformObject(value, toolName);
      } else {
        transformed[key] = value;
      }
    }
    return transformed;
  }

  return obj;
}

/**
 * Normalizes tool results post-execution for get_invoice and check_payment_history.
 *
 * @param {string} toolName - Name of the tool executed.
 * @param {string} rawResult - Raw tool execution result as a JSON string.
 * @returns {string} Normalized tool result as a JSON string.
 */
export function normalizeToolResult(toolName, rawResult) {
  if (!ALLOWED_TOOLS.has(toolName)) {
    return rawResult;
  }

  let parsed;
  try {
    parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
  } catch (error) {
    console.error(`[normalizer] Error parsing JSON for tool '${toolName}':`, error.message);
    return rawResult;
  }

  const transformed = transformObject(parsed, toolName);
  return JSON.stringify(transformed);
}
