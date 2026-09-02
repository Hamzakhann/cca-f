// good/tools.js
// Each tool has one job. The name communicates domain and action.
// No type/operation/action parameters — those are a sign you
// should have split the tool.

export const GOOD_NAMED_TOOLS = [
    {
        name: "get_customer",
        description: `Retrieves account-level profile data for a specific
customer by their unique customer ID.

Returns: customer_id (string), name (string), email (string),
account_status ('active'|'suspended'|'closed'),
account_tier ('standard'|'premium'|'enterprise'),
created_at (ISO 8601 date), currency ('PKR').

Use when: verifying customer identity, checking account status
before processing a refund, determining support tier.

Do NOT use for: order details (use lookup_order),
payment transactions (use check_payment_history),
processing refunds (use process_refund).

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: {
                    type: "string",
                    description: "Customer ID in format C-XXXX"
                }
            },
            required: ["customer_id"]
        }
    },

    {
        name: "lookup_order",
        description: `Retrieves a specific order record by order ID.

Returns: order_id (string), item (string), purchase_date (ISO 8601),
amount (number in PKR), payment_status ('paid'|'pending'|'failed'),
shipping_status ('processing'|'shipped'|'delivered'|'returned'),
currency ('PKR').

Use when: checking delivery status, retrieving purchase date for
return eligibility, investigating a specific transaction by order ID.

Do NOT use for: customer account status (use get_customer),
payment transaction history (use check_payment_history).

Example: { order_id: 'ORD-5001' }`,
        input_schema: {
            type: "object",
            properties: {
                order_id: {
                    type: "string",
                    description: "Order ID in format ORD-XXXX"
                }
            },
            required: ["order_id"]
        }
    },

    {
        name: "check_payment_history",
        description: `Retrieves all payment transactions for a customer,
showing individual payment records across all invoices.

Returns: customer_id (string), currency ('PKR'), payments (array of:
payment_id, invoice_id, date (ISO 8601), amount (PKR),
status ('completed'|'pending'|'failed'|'refunded')).

Use when: investigating duplicate charges, verifying a refund was
applied, reviewing the full payment sequence for a customer.

Do NOT use for: order shipping status (use lookup_order),
customer account profile (use get_customer).

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: {
                    type: "string",
                    description: "Customer ID in format C-XXXX"
                }
            },
            required: ["customer_id"]
        }
    },

    {
        name: "check_return_eligibility",
        description: `Determines whether a specific order qualifies for
return under the 30-day return policy.

Returns: order_id (string), eligible (boolean), reason (string),
days_remaining (integer), refund_amount (number in PKR),
currency ('PKR').

Use when: a customer requests a return, after retrieving order
details with lookup_order to confirm purchase date.

Do NOT use for: processing the actual refund (use process_refund
after eligibility is confirmed), checking payment history
(use check_payment_history).

Example: { order_id: 'ORD-5001', days_since_purchase: 12 }`,
        input_schema: {
            type: "object",
            properties: {
                order_id: {
                    type: "string",
                    description: "Order ID in format ORD-XXXX"
                },
                days_since_purchase: {
                    type: "number",
                    description: "Number of days since purchase date"
                }
            },
            required: ["order_id", "days_since_purchase"]
        }
    },

    {
        name: "process_refund",
        description: `Executes an automated refund for a confirmed
duplicate payment or approved product return. ACTION TOOL —
modifies financial records.

Returns: success (boolean), refund_id (string), amount (number PKR),
currency ('PKR'), estimated_processing_days (integer 5-7).

Use when: duplicate charge confirmed via check_payment_history,
return eligibility confirmed via check_return_eligibility,
amount is within PKR 50,000 automated limit.

Do NOT use for: amounts above PKR 50,000 (use escalate_to_human),
investigating whether a refund is warranted (verify first).

Example: { customer_id: 'C-1001', amount: 12500,
           reason: 'Duplicate payment PAY-8002 on INV-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                amount: {
                    type: "number",
                    description: "Refund amount in PKR. Maximum 50000."
                },
                reason: {
                    type: "string",
                    description: "Specific reason including evidence"
                }
            },
            required: ["customer_id", "amount", "reason"]
        }
    },

    {
        name: "escalate_to_human",
        description: `Creates a human escalation ticket for cases that
cannot be resolved automatically. ACTION TOOL — routes to human agent.

Returns: escalated (boolean), ticket_id (string),
assigned_to (string), priority ('high'|'medium'|'low'),
estimated_response_hours (integer).

Use when: customer explicitly requests a human agent, refund
exceeds PKR 50,000 automated limit, policy gap exists, or
3+ resolution attempts have failed. Do NOT escalate based
on customer tone or frustration alone.

Do NOT use for: automated refunds under PKR 50,000
(use process_refund), first-response before attempting
automated resolution.

Example: { customer_id: 'C-1001',
           reason: 'Refund PKR 75000 exceeds automated limit',
           refund_amount: 75000 }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                reason: {
                    type: "string",
                    description: "Why automated resolution is not possible"
                },
                refund_amount: {
                    type: "number",
                    description: "Optional — include for financial disputes"
                }
            },
            required: ["customer_id", "reason"]
        }
    }
]