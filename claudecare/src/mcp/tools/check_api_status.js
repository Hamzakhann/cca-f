export const definition = {
  name: "check_api_status",
  description: `Checks operational status, response latency, and endpoint uptime for ClaudeCare APIs and third-party service integrations.
Returns: endpoint, status (operational/degraded/outage), latency_ms (integer), uptime_percent (number), last_checked (ISO 8601).
When to use: Use when investigating system outages, API authentication failures, connection timeouts, or service degradation reports.
When NOT to use: Do NOT use for customer error log traces (use get_error_logs). Do NOT use for customer account info (use get_customer).
Example: { endpoint: "auth-v1" }`,
  input_schema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        description: "API endpoint identifier (e.g. auth-v1, billing-api, gateway-v2)",
      },
    },
    required: ["endpoint"],
  },
};

const MOCK_ENDPOINTS = {
  "auth-v1": {
    endpoint: "auth-v1",
    status: "operational",
    latency_ms: 45,
    uptime_percent: 99.9,
    last_checked: "2026-08-19T14:00:00Z",
  },
  "billing-api": {
    endpoint: "billing-api",
    status: "degraded",
    latency_ms: 1200,
    uptime_percent: 98.2,
    last_checked: "2026-08-19T14:00:00Z",
  },
  "gateway-v2": {
    endpoint: "gateway-v2",
    status: "outage",
    latency_ms: 0,
    uptime_percent: 85.0,
    last_checked: "2026-08-19T14:00:00Z",
  },
};

/**
 * Executor for check_api_status tool.
 *
 * @param {Object} params
 * @param {string} params.endpoint - API endpoint string.
 * @returns {Promise<Object>} Status object or structured error object.
 */
export async function executor({ endpoint } = {}) {
  if (!endpoint || typeof endpoint !== "string" || !endpoint.trim()) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "API endpoint is required and cannot be empty.",
    };
  }

  if (endpoint === "END-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "API status service healthcheck timeout after 5s",
    };
  }

  const status = MOCK_ENDPOINTS[endpoint];
  if (!status) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No status records found for endpoint '${endpoint}'.`,
    };
  }

  return status;
}
