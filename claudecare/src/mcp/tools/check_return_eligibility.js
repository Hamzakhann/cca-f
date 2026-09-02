export const definition = {
  name: "check_return_eligibility",
  description: `Determines whether a specific order qualifies for return under ClaudeCare's 30-day return policy based on days elapsed since purchase.
Returns: order_id, eligible (boolean), reason (explanation of decision), days_remaining (integer — days left in window if eligible, 0 if not), refund_amount (PKR — full order amount if eligible, 0 if not), currency: "PKR".
When to use: Use when a customer requests a return or refund for a product, after retrieving the order with lookup_order to get the purchase date.
When NOT to use: Do NOT use for retrieving order details (use lookup_order first to get purchase_date and amount before calling this tool). Do NOT use to process the actual refund (use process_refund after eligibility is confirmed).
Example: { order_id: "ORD-5001", days_since_purchase: 12 }`,
  input_schema: {
    type: "object",
    properties: {
      order_id: {
        type: "string",
        description: "Order ID in format ORD-XXXX (e.g. ORD-5001)",
      },
      days_since_purchase: {
        type: "number",
        description: "Days elapsed since purchase date",
      },
    },
    required: ["order_id", "days_since_purchase"],
  },
};

const MOCK_ORDER_AMOUNTS = {
  "ORD-5001": 15000,
  "ORD-5002": 95000,
  "ORD-5003": 3500,
};

/**
 * Executor for check_return_eligibility tool.
 *
 * @param {Object} params
 * @param {string} params.order_id - Order ID string in format ORD-XXXX.
 * @param {number} params.days_since_purchase - Days elapsed since purchase.
 * @returns {Promise<Object>} Eligibility evaluation object or structured error object.
 */
export async function executor({ order_id, days_since_purchase } = {}) {
  if (typeof order_id !== "string" || !/^ORD-\d{4}$/.test(order_id)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Invalid order_id format. Expected ORD-XXXX.",
    };
  }

  if (typeof days_since_purchase !== "number" || days_since_purchase < 0 || isNaN(days_since_purchase)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "days_since_purchase must be a non-negative number.",
    };
  }

  if (order_id === "ORD-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Order database timeout after 5s",
    };
  }

  const orderAmount = MOCK_ORDER_AMOUNTS[order_id];
  if (orderAmount === undefined) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No order found with ID ${order_id}.`,
    };
  }

  const eligible = days_since_purchase <= 30;
  const days_remaining = Math.max(0, 30 - days_since_purchase);
  const refund_amount = eligible ? orderAmount : 0;
  const reason = eligible
    ? `Order was purchased ${days_since_purchase} day(s) ago, which is within the 30-day return window.`
    : `Order was purchased ${days_since_purchase} day(s) ago, exceeding the 30-day return window.`;

  return {
    order_id,
    eligible,
    reason,
    days_remaining,
    refund_amount,
    currency: "PKR",
  };
}
