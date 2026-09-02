export const definition = {
  name: "get_error_logs",
  description: `Retrieves technical error log traces, SDK exception logs, and API authentication failure details for a customer or service.
Returns: customer_id, service, logs array where each entry has log_id, timestamp (ISO 8601), error_code, message, stack_trace_snippet.
When to use: Use when investigating technical integration failures, SDK configuration errors, API authentication rejections, or server error traces.
When NOT to use: Do NOT use for checking overall API endpoint health (use check_api_status). Do NOT use for customer profile details (use get_customer).
Example: { customer_id: "C-1001" }`,
  input_schema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID in format C-XXXX (e.g. C-1001)",
      },
      service: {
        type: "string",
        description: "Optional service filter (e.g. auth, sdk, api)",
      },
    },
    required: ["customer_id"],
  },
};

const MOCK_ERROR_LOGS = {
  "C-1001": {
    customer_id: "C-1001",
    service: "auth",
    logs: [
      {
        log_id: "LOG-4001",
        timestamp: "2026-08-19T13:45:00Z",
        error_code: "AUTH_EXPIRED_TOKEN",
        message: "API Token expired for tenant C-1001",
        stack_trace_snippet: "AuthenticationError: token expired at AuthController.verify (auth.js:42)",
      },
    ],
  },
  "C-1002": {
    customer_id: "C-1002",
    service: "sdk",
    logs: [
      {
        log_id: "LOG-4002",
        timestamp: "2026-08-19T11:20:00Z",
        error_code: "SDK_INVALID_CONFIG",
        message: "Invalid base_url configured in SDK client",
        stack_trace_snippet: "ConfigurationError: base_url must start with https:// at Client.init (client.js:18)",
      },
    ],
  },
};

/**
 * Executor for get_error_logs tool.
 *
 * @param {Object} params
 * @param {string} params.customer_id - Customer ID string in format C-XXXX.
 * @param {string} [params.service] - Optional service name.
 * @returns {Promise<Object>} Error logs object or structured error object.
 */
export async function executor({ customer_id, service } = {}) {
  if (typeof customer_id !== "string" || !/^C-\d{4}$/.test(customer_id)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Invalid customer_id format. Expected C-XXXX.",
    };
  }

  if (customer_id === "C-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Error logging service database timeout after 5s",
    };
  }

  const logsRecord = MOCK_ERROR_LOGS[customer_id];
  if (!logsRecord) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No error logs found for customer ID ${customer_id}.`,
    };
  }

  return logsRecord;
}
