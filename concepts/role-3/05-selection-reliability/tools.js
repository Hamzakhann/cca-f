// tools.js — FIXED VERSION
// Changes are marked with ← FIXED comments

export const CLAUDECARE_TOOLS = [
    {
        name: "get_customer",
        description: `Retrieves account-level profile data for a specific
customer by their unique customer ID.

Returns: customer_id (string), name (string), email (string),
account_status ('active'|'suspended'|'closed'),
account_tier ('standard'|'premium'|'enterprise'),
created_at (ISO 8601 date), preferred_contact ('email'|'phone'|'sms'),
currency ('PKR').

Use when: verifying customer identity before any financial operation,
checking account_status before processing a refund, determining
account_tier for support priority or policy eligibility,
retrieving contact preferences before sending a notification.

Do NOT use for: order or purchase records, what a customer bought,
recent purchases, item details, or shipping status
(use lookup_order for all of these),
payment transaction history or duplicate charge investigation
(use check_payment_history),
processing refunds (use process_refund),
checking return eligibility or whether a customer can send
an item back (use check_return_eligibility).

Example: { customer_id: 'C-1001' }`,
        // ← FIXED: expanded negative boundary to include "recent purchase",
        //   "what a customer bought", "send an item back"
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
        name: "lookup_order",
        description: `Retrieves a specific order record by order ID.
This tool handles ORDER data only — not account or payment data.

Returns: order_id (string), item (string), purchase_date (ISO 8601),
amount (number in PKR), payment_status ('paid'|'pending'|'failed'),
shipping_status ('processing'|'shipped'|'delivered'|'returned'),
currency ('PKR').

Use when: any question about a specific purchase, order, or item
the customer bought — including "tell me about their recent
purchase", "what's the situation with their order", "what did
they buy", "what did I pay for X item", "what was the cost of
the headphones I ordered", checking delivery or shipping status,
retrieving purchase date for return window calculation. If the
question involves something the customer purchased or ordered
(not payment transactions), use this tool.

Do NOT use for: customer account profile or tier status
(use get_customer), all payment transactions across invoices
(use check_payment_history), processing a refund
(use process_refund), checking return eligibility when
customer wants to send something back
(use check_return_eligibility directly).

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
        description: `Retrieves ALL payment transactions for a customer —
individual payment records across all invoices and orders.

Returns: customer_id (string), currency ('PKR'), payments (array of:
payment_id, invoice_id, date (ISO 8601), amount (number PKR),
status ('completed'|'pending'|'failed'|'refunded')).

Use when: investigating a suspected duplicate charge (look for two
completed payments against the same invoice on consecutive dates),
verifying whether a specific payment was processed, confirming
a refund has been applied (look for status: 'refunded'),
reviewing a customer's full payment sequence.

Do NOT use for: a single order's item details, what the customer
bought, or what they paid for a specific product
(use lookup_order — it shows item name, amount, and shipping),
account profile or status (use get_customer),
executing a refund when duplicate is already confirmed
(use process_refund directly).

Example: { customer_id: 'C-1001' }`,
        // ← FIXED: negative boundary now explicitly says "what the customer
        //   bought" and "what they paid for a specific product" → lookup_order
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
        name: "check_return_eligibility",
        description: `Determines whether a specific order qualifies for
return under the 30-day return policy. READ-ONLY — does not initiate
the return or process any refund.

Returns: order_id (string), eligible (boolean), reason (string),
days_remaining (integer — days left in return window),
refund_amount (number in PKR), currency ('PKR').

Use when: THIS IS THE FIRST TOOL TO CALL when a customer wants to
return or send back a product — phrases like "I want to return this",
"can I send it back", "I bought headphones and want to return them",
"can I get a refund for something I purchased", "is my item
returnable", "I want to exchange this". Call this directly — you
do not need to call lookup_order first. This tool handles the
complete return eligibility check internally.

Do NOT use for: processing the actual refund after eligibility
is confirmed (use process_refund), payment transaction history
(use check_payment_history), general order status when no
return is being requested (use lookup_order).

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
                    description: "Integer number of days since purchase date"
                }
            },
            required: ["order_id", "days_since_purchase"]
        }
    },

    {
        name: "process_refund",
        description: `Executes an automated refund for a confirmed
duplicate payment or approved product return. ACTION TOOL —
permanently modifies financial records. Requires verified evidence.

Returns: success (boolean), refund_id (string), amount (number PKR),
currency ('PKR'), estimated_processing_days (integer, typically 5-7).

Use when: THE DUPLICATE CHARGE IS ALREADY CONFIRMED — call this
tool IMMEDIATELY without re-investigating. Trigger phrases that
mean call this tool now: "the duplicate is confirmed", "duplicate
charge is confirmed", "already verified the duplicate", "charge
has been confirmed", "investigation is complete, process the
refund". Do NOT call check_payment_history again when these
phrases appear — the evidence is already established.
Also use when return eligibility is confirmed via
check_return_eligibility AND amount is within PKR 50,000 limit.

Do NOT use for: amounts above PKR 50,000 (use escalate_to_human),
cases where duplicate is SUSPECTED but not yet confirmed —
use check_payment_history first to investigate,
checking refund status (use check_payment_history).

Example: { customer_id: 'C-1001', amount: 12500,
           reason: 'Confirmed duplicate payment PAY-8002 on INV-1001' }`,
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
                    description: "Specific reason including evidence (payment ID, invoice ID)"
                }
            },
            required: ["customer_id", "amount", "reason"]
        }
    },

    {
        name: "escalate_to_human",
        description: `Creates a human escalation ticket for cases that
cannot be resolved automatically. ACTION TOOL — routes to a human
agent. Use only after attempting automated resolution.

Returns: escalated (boolean), ticket_id (string),
assigned_to (string — agent name or tier),
priority ('high'|'medium'|'low'),
estimated_response_hours (integer).

Use when: (a) customer EXPLICITLY requests a human agent
using phrases like 'speak to a manager', 'want a human',
'transfer me', (b) refund amount exceeds PKR 50,000 automated
limit, (c) no policy rule covers the customer's situation
(policy gap), (d) three or more consecutive resolution
attempts have failed. Do NOT escalate based on angry tone alone.

Do NOT use for: automated refunds under PKR 50,000
(use process_refund), first response before attempting
automated resolution, checking account or order status.

Example: { customer_id: 'C-1001',
           reason: 'Refund PKR 75,000 exceeds automated limit',
           refund_amount: 75000 }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                reason: {
                    type: "string",
                    description: "Specific reason why automated resolution is not possible"
                },
                refund_amount: {
                    type: ["number", "null"],
                    description: "Optional. Include for financial escalations."
                },
                priority: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Optional. Defaults to medium."
                }
            },
            required: ["customer_id", "reason"]
        }
    }
]