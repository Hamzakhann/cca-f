export const definition = {
  name: "check_payment_history",
  description: `Retrieves the complete payment transaction history for a customer, showing individual payment records. A duplicate charge appears as two payments with the same amount against the same invoice on consecutive dates.
Returns: customer_id, currency, payments array where each entry has: payment_id, invoice_id, date (ISO 8601), amount (PKR), status (completed/pending/failed/refunded).
When to use: Use when investigating duplicate charges, verifying payment sequence, confirming whether a specific payment was processed, checking for refunded transactions.
When NOT to use: Do NOT use for invoice-level details like issue date or overdue status (use get_invoice). Do NOT use for account status (use get_customer).
Example: { customer_id: "C-1001" }`,
  input_schema: {
    type: "object",
    properties: {
      customer_id: {
        type: "string",
        description: "Customer ID in format C-XXXX (e.g. C-1001)",
      },
    },
    required: ["customer_id"],
  },
};

const MOCK_PAYMENT_HISTORIES = {
  "C-1001": {
    customer_id: "C-1001",
    currency: "PKR",
    payments: [
      {
        payment_id: "PAY-8001",
        invoice_id: "INV-1001",
        date: "2026-08-01",
        amount: 12500,
        status: "completed",
      },
      {
        payment_id: "PAY-8002",
        invoice_id: "INV-1001",
        date: "2026-08-02",
        amount: 12500,
        status: "completed",
      },
    ],
  },
  "C-1002": {
    customer_id: "C-1002",
    currency: "PKR",
    payments: [
      {
        payment_id: "PAY-9001",
        invoice_id: "INV-2002",
        date: "2026-07-15",
        amount: 8750,
        status: "completed",
      },
    ],
  },
  "C-1003": {
    customer_id: "C-1003",
    currency: "PKR",
    payments: [
      {
        payment_id: "PAY-7001",
        invoice_id: "INV-3003",
        date: "2026-08-10",
        amount: 45000,
        status: "pending",
      },
    ],
  },
};

/**
 * Executor for check_payment_history tool.
 *
 * @param {Object} params
 * @param {string} params.customer_id - Customer ID string in format C-XXXX.
 * @returns {Promise<Object>} Payment history object or structured error object.
 */
export async function executor({ customer_id } = {}) {
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
      description: "Payment history database timeout after 5s",
    };
  }

  const history = MOCK_PAYMENT_HISTORIES[customer_id];
  if (!history) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No payment history found for customer ID ${customer_id}.`,
    };
  }

  return history;
}
