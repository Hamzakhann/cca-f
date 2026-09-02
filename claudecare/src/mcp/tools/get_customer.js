export const definition = {
  name: "get_customer",
  description: `Retrieves account-level customer profile, account standing, and contact details by customer ID or name.
Returns: name, email, account_status (active/suspended/closed), account_tier (standard/premium/enterprise), created_at (ISO 8601), preferred_contact (email/phone/sms), and currency: "PKR".
When to use: Use ONLY when specifically asked for customer account status, account tier, profile details, identity verification, or contact preferences (e.g. "What's Ahmed's account status?", "Check Ahmed Ali's details").
When NOT to use: Do NOT use if the user query asks about a purchase, recent purchase, order details, order status, or order ID (use lookup_order for ALL purchase and order queries). Do NOT use for processing refunds (use process_refund).
Example: { customer_id: "C-1001" }`,
  input_schema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID in format C-XXXX (e.g. C-1001). Default to C-1001 if omitted.",
      },
    },
  },
};

const MOCK_CUSTOMERS = {
  "C-1001": {
    name: "Ahmed Ali",
    email: "ahmed.ali@example.com",
    account_status: "active",
    account_tier: "premium",
    created_at: "2022-03-15",
    preferred_contact: "email",
    currency: "PKR",
  },
  "C-1002": {
    name: "Sara Khan",
    email: "sara.khan@example.com",
    account_status: "active",
    account_tier: "standard",
    created_at: "2023-07-01",
    preferred_contact: "phone",
    currency: "PKR",
  },
  "C-1003": {
    name: "Bilal Ahmed",
    email: "bilal.ahmed@example.com",
    account_status: "suspended",
    account_tier: "enterprise",
    created_at: "2021-11-20",
    preferred_contact: "sms",
    currency: "PKR",
  },
};

/**
 * Executor for get_customer tool.
 *
 * @param {Object} params
 * @param {string} [params.customer_id] - Customer ID string.
 * @returns {Promise<Object>} Customer object or structured error object.
 */
export async function executor({ customer_id } = {}) {
  const targetId = customer_id || "C-1001";
  if (typeof targetId !== "string" || !/^C-\d{4}$/.test(targetId)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: `Invalid customer_id format. Expected 'C-XXXX'. Received: '${targetId}'`,
    };
  }

  if (targetId === "C-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Customer database timeout after 5s",
    };
  }

  const customer = MOCK_CUSTOMERS[targetId];
  if (!customer) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No customer found with ID ${targetId}. Verify the customer ID and try again.`,
    };
  }

  return customer;
}
