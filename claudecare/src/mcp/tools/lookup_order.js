export const definition = {
  name: "lookup_order",
  description: `Retrieves order records, item details, purchase history, delivery statuses, and order amounts by order ID or purchase query.
Returns: order_id, item name, purchase_date (ISO 8601), amount (PKR), payment_status (paid/pending/failed), shipping_status (processing/shipped/delivered/returned), and currency: "PKR".
When to use: Use whenever a customer query asks about a purchase, recent purchase, item bought, order status, order number, delivery status, or initiating a return (e.g. "Tell me about this customer's recent purchase", "Can you check order ORD-5001?").
When NOT to use: Do NOT use for customer account status or profile details (use get_customer). Do NOT use to process a refund (use process_refund).
Example: { order_id: "ORD-5001" }`,
  input_schema: {
    type: "object",
    properties: {
      order_id: {
        type: "string",
        description: "Order ID in format ORD-XXXX (e.g. ORD-5001). Default to ORD-5001 if omitted.",
      },
    },
  },
};

const MOCK_ORDERS = {
  "ORD-5001": {
    order_id: "ORD-5001",
    item: "Wireless Headphones",
    purchase_date: "2026-08-01",
    amount: 15000,
    payment_status: "paid",
    shipping_status: "delivered",
    currency: "PKR",
  },
  "ORD-5002": {
    order_id: "ORD-5002",
    item: "Laptop Pro",
    purchase_date: "2026-06-20",
    amount: 95000,
    payment_status: "paid",
    shipping_status: "delivered",
    currency: "PKR",
  },
  "ORD-5003": {
    order_id: "ORD-5003",
    item: "USB-C Hub",
    purchase_date: "2026-08-10",
    amount: 3500,
    payment_status: "pending",
    shipping_status: "processing",
    currency: "PKR",
  },
};

/**
 * Executor for lookup_order tool.
 *
 * @param {Object} params
 * @param {string} [params.order_id] - Order ID string.
 * @returns {Promise<Object>} Order object or structured error object.
 */
export async function executor({ order_id } = {}) {
  const targetId = order_id || "ORD-5001";
  if (typeof targetId !== "string" || !/^ORD-\d{4}$/.test(targetId)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: `Invalid order_id format. Expected 'ORD-XXXX'. Received: '${targetId}'`,
    };
  }

  if (targetId === "ORD-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Order database timeout after 5s",
    };
  }

  const order = MOCK_ORDERS[targetId];
  if (!order) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No order found with ID ${targetId}. Verify the order ID and try again.`,
    };
  }

  return order;
}
