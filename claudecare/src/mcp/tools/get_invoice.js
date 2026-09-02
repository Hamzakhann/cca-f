export const definition = {
  name: "get_invoice",
  description: `Retrieves a specific invoice record by invoice ID, including payment count which signals potential duplicate charges when greater than 1.
Returns: invoice_id, amount (PKR), currency, status (paid/pending/overdue), payment_count (integer — values > 1 indicate possible duplicate charges), issue_date (ISO 8601).
When to use: Use when investigating a billing dispute, verifying whether an invoice was paid, checking if multiple payments were made against a single invoice.
When NOT to use: Do NOT use for customer account details (use get_customer). Do NOT use for full payment transaction history (use check_payment_history — it shows individual payment records). Do NOT use for order or product details (use lookup_order).
Example: { invoice_id: "INV-1001" }`,
  input_schema: {
    type: "object",
    properties: {
      invoice_id: {
        type: "string",
        description: "Invoice ID in format INV-XXXX (e.g. INV-1001)",
      },
    },
    required: ["invoice_id"],
  },
};

const MOCK_INVOICES = {
  "INV-1001": {
    invoice_id: "INV-1001",
    amount: 12500,
    currency: "PKR",
    status: "paid",
    payment_count: 2,
    issue_date: "2026-08-01",
  },
  "INV-2002": {
    invoice_id: "INV-2002",
    amount: 8750,
    currency: "PKR",
    status: "paid",
    payment_count: 1,
    issue_date: "2026-07-15",
  },
  "INV-3003": {
    invoice_id: "INV-3003",
    amount: 45000,
    currency: "PKR",
    status: "pending",
    payment_count: 0,
    issue_date: "2026-08-10",
  },
};

/**
 * Executor for get_invoice tool.
 *
 * @param {Object} params
 * @param {string} params.invoice_id - Invoice ID string in format INV-XXXX.
 * @returns {Promise<Object>} Invoice object or structured error object.
 */
export async function executor({ invoice_id } = {}) {
  if (typeof invoice_id !== "string" || !/^INV-\d{4}$/.test(invoice_id)) {
    return {
      isError: true,
      errorCategory: "validation",
      isRetryable: true,
      description: "Invalid invoice_id format. Expected INV-XXXX.",
    };
  }

  if (invoice_id === "INV-0000") {
    return {
      isError: true,
      errorCategory: "transient",
      isRetryable: true,
      description: "Invoice database timeout after 5s",
    };
  }

  const invoice = MOCK_INVOICES[invoice_id];
  if (!invoice) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `No invoice found with ID ${invoice_id}.`,
    };
  }

  return invoice;
}
