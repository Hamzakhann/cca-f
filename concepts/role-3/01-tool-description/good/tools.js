// good/tools.js
// Every description has all 5 components.
// Notice how much longer they are — that length is information,
// not verbosity.

export const GOOD_TOOLS = [
    {
        name: "get_customer",
        description: `Retrieves account-level profile data for a specific customer by their unique customer ID.

Returns: customer_id (string), name (string), email (string), account_status ('active' | 'suspended' | 'closed'), account_tier ('standard' | 'premium' | 'enterprise'), created_at (ISO 8601 date string), preferred_contact ('email' | 'phone' | 'sms'), currency ('PKR').

Use when: verifying customer identity before any financial operation, checking account_status before processing a refund, determining account_tier for support priority or policy eligibility, retrieving contact preferences before sending a notification.

Do NOT use for: retrieving order or purchase records (use lookup_order instead), viewing payment transaction history (use check_payment_history instead), processing refunds (use process_refund instead), checking API integration health (use check_api_status instead).

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: {
                    type: "string",
                    description: "Customer ID in format C-XXXX (e.g. C-1001, C-2847)"
                }
            },
            required: ["customer_id"]
        }
    },

    {
        name: "lookup_order",
        description: `Retrieves a specific order record by order ID, including item details, purchase date, payment status, and shipping status.

Returns: order_id (string), item (string), purchase_date (ISO 8601 date), amount (number in PKR), payment_status ('paid' | 'pending' | 'failed'), shipping_status ('processing' | 'shipped' | 'delivered' | 'returned'), currency ('PKR').

Use when: a customer references a specific order or purchase, checking delivery status for a shipped item, retrieving purchase date for return eligibility calculation, investigating a specific transaction by order ID.

Do NOT use for: customer account status or contact information (use get_customer instead), viewing all payment transactions across multiple invoices (use check_payment_history instead), processing a refund (use process_refund instead). This tool retrieves ONE specific order — it does not return order history.

Example: { order_id: 'ORD-5001' }`,
        input_schema: {
            type: "object",
            properties: {
                order_id: {
                    type: "string",
                    description: "Order ID in format ORD-XXXX (e.g. ORD-5001)"
                }
            },
            required: ["order_id"]
        }
    },

    {
        name: "check_payment_history",
        description: `Retrieves the complete list of payment transactions made by a specific customer, showing individual payment records across all invoices.

Returns: customer_id (string), currency ('PKR'), payments (array of: payment_id (string), invoice_id (string), date (ISO 8601), amount (number in PKR), status ('completed' | 'pending' | 'failed' | 'refunded')).

Use when: investigating a suspected duplicate charge (look for two completed payments against the same invoice), verifying whether a specific payment was processed, reviewing a customer's full payment sequence, confirming a refund has been applied to the account.

Do NOT use for: retrieving a single order's details (use lookup_order instead), checking account status (use get_customer instead), viewing invoice-level data such as issue date or payment_count (use get_invoice instead). This tool returns individual payment transactions, not invoice summaries.

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: {
                    type: "string",
                    description: "Customer ID in format C-XXXX (e.g. C-1001)"
                }
            },
            required: ["customer_id"]
        }
    },

    {
        name: "process_refund",
        description: `Executes an automated refund for a confirmed duplicate payment or approved product return. This is an ACTION tool — it modifies financial records, not just retrieves data.

Returns: success (boolean), refund_id (string), amount (number in PKR), currency ('PKR'), estimated_processing_days (integer, typically 5-7).

Use when: a duplicate charge has been confirmed via check_payment_history, return eligibility has been confirmed via check_return_eligibility, the refund amount is within PKR 50,000 automated limit, and you have the customer_id and refund reason ready.

Do NOT use for: investigating whether a refund is warranted (verify first with get_invoice or check_payment_history), refund amounts above PKR 50,000 (use escalate_to_human instead), retrieving refund status of a past refund (use check_payment_history and look for status: 'refunded').

Example: { customer_id: 'C-1001', amount: 12500, reason: 'Confirmed duplicate payment PAY-8002 on invoice INV-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: {
                    type: "string",
                    description: "Customer ID in format C-XXXX"
                },
                amount: {
                    type: "number",
                    description: "Refund amount in PKR. Must be positive. Cannot exceed 50000."
                },
                reason: {
                    type: "string",
                    description: "Specific reason for the refund including evidence (e.g. payment ID, invoice ID)"
                }
            },
            required: ["customer_id", "amount", "reason"]
        }
    }
]