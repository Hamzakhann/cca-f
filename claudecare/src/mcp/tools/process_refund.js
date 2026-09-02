export const definition = {
  name: "process_refund",
  description: `Processes an automated refund for confirmed duplicate charges, overcharges, or approved product returns. This is an ACTION tool — it executes a financial transaction directly.
Returns: success boolean, refund_id, amount (PKR), currency, estimated_processing_days (5-7 business days).
When to use: Use when requested to process or issue a refund, or when duplicate payment / return eligibility is confirmed for amounts within PKR 50,000 automated limit (e.g. "Process a PKR 12,500 refund for C-1001").
When NOT to use: Do NOT use for amounts above PKR 50,000 (use escalate_to_human).
Example: { customer_id: "C-1001", amount: 12500, reason: "confirmed duplicate payment PAY-8002" }`,
  input_schema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID in format C-XXXX (e.g. C-1001)",
      },
      amount: {
        type: "number",
        description: "Refund amount in PKR (must be <= 50000)",
      },
      reason: {
        type: "string",
        description: "Reason describing the basis for the refund",
      },
    },
    required: ["customer_id", "amount", "reason"],
  },
};

const VALID_CUSTOMERS = new Set(["C-1001", "C-1002", "C-1003"]);

/**
 * Executor for process_refund tool.
 *
 * @param {Object} params
 * @param {string} params.customer_id - Customer ID.
 * @param {number} params.amount - Refund amount in PKR.
 * @param {string} params.reason - Basis for refund.
 * @returns {Promise<Object>} Success result or structured error object.
 */
export async function executor({ customer_id, amount, reason }) {
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Refund reason is required and cannot be empty.",
    };
  }

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
      description: "Payment gateway connection timeout after 5s",
    };
  }

  if (typeof amount !== "number" || amount > 50000) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `Refund amount PKR ${amount} exceeds the automated limit of PKR 50,000. Use escalate_to_human for refunds above PKR 50,000.`,
    };
  }

  if (!VALID_CUSTOMERS.has(customer_id)) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No active customer found with ID ${customer_id}. Cannot process refund.`,
    };
  }

  const randomDigits = Math.floor(100 + Math.random() * 900);
  return {
    success: true,
    refund_id: `REF-${randomDigits}`,
    amount,
    currency: "PKR",
    estimated_processing_days: 5,
  };
}
