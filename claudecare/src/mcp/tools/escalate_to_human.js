export const definition = {
  name: "escalate_to_human",
  description: `Creates a human escalation ticket for cases that cannot be resolved automatically or when human intervention is requested. Routes to an appropriate human agent with a structured handoff summary.
Returns: escalated boolean, ticket_id (TKT-XXXX), assigned_to (agent tier), priority (high/medium/low), estimated_response_hours.
When to use: Use when (a) customer explicitly requests a human agent or states "This needs a human", (b) refund amount exceeds PKR 50,000 automated limit, (c) policy gap — no automated rule covers the situation, (d) 3+ consecutive resolution attempts have failed.
When NOT to use: Do NOT use for automated refunds under PKR 50,000 (use process_refund).
Example: { customer_id: "C-1001", reason: "Customer requested human escalation", refund_amount: 75000 }`,
  input_schema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID in format C-XXXX (e.g. C-1001). Default to C-1001 if omitted.",
      },
      reason: {
        type: "string",
        description: "Reason for escalating the issue to a human agent.",
      },
      refund_amount: {
        type: "number",
        description: "Optional refund amount in PKR when escalating financial disputes",
      },
      priority: {
        type: "string",
        enum: ["high", "medium", "low"],
        default: "medium",
        description: "Priority level of the escalation ticket",
      },
    },
  },
};

const VALID_CUSTOMERS = new Set(["C-1001", "C-1002", "C-1003"]);

/**
 * Executor for escalate_to_human tool.
 *
 * @param {Object} params
 * @param {string} [params.customer_id] - Customer ID.
 * @param {string} [params.reason] - Escalation reason.
 * @param {number} [params.refund_amount] - Refund amount in PKR if applicable.
 * @param {string} [params.priority] - Desired priority level.
 * @returns {Promise<Object>} Escalation result or structured error object.
 */
export async function executor({ customer_id, reason, refund_amount, priority } = {}) {
  if (reason !== undefined && (typeof reason !== "string" || !reason.trim())) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Escalation reason is required and cannot be empty.",
    };
  }

  const targetCustomer = customer_id || "C-1001";

  if (typeof targetCustomer !== "string" || !/^C-\d{4}$/.test(targetCustomer)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Invalid customer_id format. Expected C-XXXX.",
    };
  }

  if (targetCustomer === "C-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Escalation ticketing service connection timeout after 5s",
    };
  }

  if (!VALID_CUSTOMERS.has(targetCustomer)) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No active customer found with ID ${targetCustomer}. Cannot create escalation ticket.`,
    };
  }

  const targetReason = reason && reason.trim() ? reason : "Customer requested human escalation";
  let calculatedPriority = priority || "medium";
  if (typeof refund_amount === "number" && refund_amount > 50000) {
    calculatedPriority = "high";
  }

  const assignedTo = calculatedPriority === "high" ? "Senior Billing Agent" : "Support Agent";
  const estimatedResponseHours = calculatedPriority === "high" ? 4 : 24;
  const randomDigits = Math.floor(100 + Math.random() * 900);

  return {
    escalated: true,
    ticket_id: `TKT-${randomDigits}`,
    assigned_to: assignedTo,
    priority: calculatedPriority,
    estimated_response_hours: estimatedResponseHours,
  };
}
