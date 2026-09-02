// broken/tools.js
// 6 tools. Each one demonstrates one anti-pattern.
// These look like real code. Developers ship these every day.

export const BROKEN_TOOLS = [

    // ── Anti-Pattern 1: Vague Action ─────────────────────────────
    {
        name: "get_info",
        description: "Gets information about customers and orders.",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID to look up"
                }
            },
            required: ["id"]
        }
    },

    // ── Anti-Pattern 2: Missing Return Shape ──────────────────────
    {
        name: "fetch_customer",
        description: `Fetches customer data from the database.

Use when you need customer information.

Example: { customer_id: 'C-1001' }`,
        // Notice: no return shape listed at all
        // Claude has no idea what fields to expect
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },

    // ── Anti-Pattern 3: Missing Negative Boundary ─────────────────
    {
        name: "customer_lookup",
        description: `Retrieves account profile data for a customer
including name, email, account status, and tier level.

Use when: checking customer account information,
verifying identity, checking account standing.

Example: { customer_id: 'C-1001' }`,
        // Notice: no "Do NOT use for" section
        // Nothing stops Claude from using this for order queries
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },

    // ── Anti-Pattern 4: Overlapping Scope ─────────────────────────
    {
        name: "analyze_record",
        description: `Analyzes a customer or order record and returns
key details and insights.

Use when: you need to understand a customer or order situation.

Example: { record_id: 'C-1001' } or { record_id: 'ORD-5001' }`,
        // Notice: same scope as customer_lookup above
        // Claude cannot distinguish when to use this vs customer_lookup
        input_schema: {
            type: "object",
            properties: {
                record_id: { type: "string" }
            },
            required: ["record_id"]
        }
    },

    // ── Anti-Pattern 5: Wrong Consolidation ───────────────────────
    {
        name: "process_operation",
        description: `Processes a customer support operation.
Can handle refunds, returns, and escalations.

Use when: any resolution action is needed.

Example: { operation: 'refund', customer_id: 'C-1001', amount: 12500 }
         { operation: 'return', order_id: 'ORD-5001' }
         { operation: 'escalate', customer_id: 'C-1001', reason: 'gap' }`,
        input_schema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["refund", "return", "escalate"],
                    description: "The operation to perform"
                },
                customer_id: { type: "string" },
                order_id: { type: "string" },
                amount: { type: "number" },
                reason: { type: "string" }
            },
            required: ["operation"]
        }
    },

    // ── Anti-Pattern 6: Action Buried in Read Tool ─────────────────
    {
        name: "check_account_balance",
        description: `Checks the account balance and pending transactions
for a customer. If a confirmed refund is pending, automatically
applies it to the account during the check.

Use when: reviewing account financial status.

Example: { customer_id: 'C-1001' }`,
        // Notice: "automatically applies" a refund during a CHECK operation
        // This is a hidden write operation inside a read tool name
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    }
]