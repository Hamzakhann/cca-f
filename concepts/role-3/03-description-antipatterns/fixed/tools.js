// fixed/tools.js
// Same 6 tools. Each one corrected precisely.

export const FIXED_TOOLS = [

    // ── Fix 1: Vague Action → Specific Action ────────────────────
    {
        name: "get_customer",
        description: `Retrieves account-level profile data for a specific
customer by their unique customer ID.

Returns: customer_id (string), name (string), email (string),
account_status ('active'|'suspended'|'closed'),
account_tier ('standard'|'premium'|'enterprise'),
created_at (ISO 8601 date), currency ('PKR').

Use when: verifying customer identity before financial operations,
checking account_status before processing a refund,
determining account_tier for support priority.

Do NOT use for: order or purchase details (use lookup_order),
payment transaction history (use check_payment_history),
processing refunds (use process_refund).

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

    // ── Fix 2: Missing Return Shape → Complete Return Shape ───────
    {
        name: "fetch_customer",
        description: `Retrieves complete account profile for a customer.

Returns: customer_id (string), name (string), email (string),
phone (string), account_status ('active'|'suspended'|'closed'),
account_tier ('standard'|'premium'|'enterprise'),
created_at (ISO 8601 date string),
preferred_contact ('email'|'phone'|'sms'),
currency ('PKR').

Use when: you need any account-level field listed above.

Do NOT use for: order records (use lookup_order),
payment history (use check_payment_history).

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },

    // ── Fix 3: Missing Negative Boundary → Explicit Boundaries ───
    {
        name: "customer_lookup",
        description: `Retrieves account profile data for a customer
including name, email, account status, and tier level.

Returns: customer_id, name, email, account_status
('active'|'suspended'|'closed'), account_tier
('standard'|'premium'|'enterprise'), currency ('PKR').

Use when: checking customer account information,
verifying identity, checking account standing before
processing any financial operation.

Do NOT use for: order details or purchase history
(use lookup_order instead), payment transaction records
(use check_payment_history instead), processing refunds
(use process_refund instead), return eligibility
(use check_return_eligibility instead).

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },

    // ── Fix 4: Overlapping Scope → Exclusive Domains ──────────────
    {
        name: "lookup_order",
        description: `Retrieves a specific ORDER record by order ID.
This tool handles ORDER data only — not customer account data.

Returns: order_id (string), item (string),
purchase_date (ISO 8601), amount (number in PKR),
payment_status ('paid'|'pending'|'failed'),
shipping_status ('processing'|'shipped'|'delivered'|'returned'),
currency ('PKR').

Use when: checking delivery or shipping status, retrieving
purchase date for return window calculation, investigating
a specific transaction by order number.

Do NOT use for: customer account profile or status
(use customer_lookup instead), payment transaction history
across multiple invoices (use check_payment_history instead).
This tool retrieves ONE specific order — not order history.

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

    // ── Fix 5: Wrong Consolidation → 3 Split Tools ───────────────
    // The single process_operation becomes three separate tools:

    {
        name: "process_refund",
        description: `Executes an automated refund. ACTION TOOL —
modifies financial records. Requires confirmed evidence first.

Returns: success (boolean), refund_id (string),
amount (PKR number), currency ('PKR'),
estimated_processing_days (integer, 5-7).

Use when: duplicate charge confirmed via check_payment_history
OR return approved via check_return_eligibility,
AND amount is within PKR 50,000 automated limit.

Do NOT use for: amounts above PKR 50,000 (use escalate_to_human),
investigating whether refund is warranted (verify first),
initiating returns (use check_return_eligibility first).

Example: { customer_id: 'C-1001', amount: 12500,
           reason: 'Duplicate PAY-8002 on INV-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                amount: { type: "number" },
                reason: { type: "string" }
            },
            required: ["customer_id", "amount", "reason"]
        }
    },

    // ── Fix 6: Action Buried in Read → Two Clean Tools ────────────
    // The hidden write becomes two honest tools:

    {
        name: "get_account_balance",
        description: `READ-ONLY. Retrieves current account balance
and list of pending transactions. Never modifies any record.
Safe to call multiple times — has no side effects.

Returns: customer_id (string), balance_pkr (number),
pending_transactions (array of: type, amount, status, date),
currency ('PKR').

Use when: reviewing financial status before a decision,
checking if a pending refund has been applied yet.

Do NOT use for: actually applying a refund
(use process_refund instead). This tool ONLY reads —
it never creates or modifies any transaction.

Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    }
]