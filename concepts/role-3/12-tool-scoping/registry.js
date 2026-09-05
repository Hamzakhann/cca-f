// registry.js
// All 9 ClaudeCare tools in one place.
// Each agent will import and filter this.

export const ALL_TOOL_DEFINITIONS = [
    {
        name: "get_customer",
        description: `Retrieves account-level profile for a customer.
Returns: customer_id, name, account_status, account_tier, currency (PKR).
Use when: verifying identity, checking account status or tier.
Do NOT use for: orders (lookup_order), payments (check_payment_history).
Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"]
        }
    },
    {
        name: "get_invoice",
        description: `Retrieves an invoice record by invoice ID.
Returns: invoice_id, amount (PKR), status, payment_count, issue_date.
Use when: investigating billing disputes, checking payment_count for duplicates.
Do NOT use for: order details (lookup_order), all transactions (check_payment_history).
Example: { invoice_id: 'INV-1001' }`,
        input_schema: {
            type: "object",
            properties: { invoice_id: { type: "string" } },
            required: ["invoice_id"]
        }
    },
    {
        name: "check_payment_history",
        description: `Retrieves all payment transactions for a customer.
Returns: payments array with payment_id, invoice_id, date, amount, status.
Use when: investigating duplicate charges, verifying refund was applied.
Do NOT use for: single order details (lookup_order), account profile (get_customer).
Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"]
        }
    },
    {
        name: "lookup_order",
        description: `Retrieves a specific order record by order ID.
Returns: order_id, item, purchase_date, amount (PKR), shipping_status.
Use when: checking delivery status, getting purchase date for return eligibility.
Do NOT use for: payment history (check_payment_history), account profile (get_customer).
Example: { order_id: 'ORD-5001' }`,
        input_schema: {
            type: "object",
            properties: { order_id: { type: "string" } },
            required: ["order_id"]
        }
    },
    {
        name: "check_return_eligibility",
        description: `Checks if an order qualifies for return under 30-day policy.
Returns: eligible (boolean), days_remaining, refund_amount (PKR).
Use when: customer wants to return a product — call this first.
Do NOT use for: processing the refund (use process_refund after).
Example: { order_id: 'ORD-5001', days_since_purchase: 12 }`,
        input_schema: {
            type: "object",
            properties: {
                order_id: { type: "string" },
                days_since_purchase: { type: "number" }
            },
            required: ["order_id", "days_since_purchase"]
        }
    },
    {
        name: "process_refund",
        description: `Executes an automated refund. ACTION TOOL — modifies records.
Returns: success, refund_id, amount (PKR), estimated_processing_days.
Use when: duplicate confirmed via check_payment_history OR return approved,
          AND amount is within PKR 50,000 limit.
Do NOT use for: amounts above PKR 50,000 (escalate_to_human).
Example: { customer_id: 'C-1001', amount: 12500, reason: 'Duplicate PAY-8002' }`,
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
    {
        name: "escalate_to_human",
        description: `Creates a human escalation ticket. ACTION TOOL.
Returns: ticket_id, assigned_to, priority, estimated_response_hours.
Use when: customer demands human, refund above PKR 50,000, policy gap,
          or 3+ failed attempts. NOT for angry tone alone.
Do NOT use for: automated refunds under PKR 50,000 (process_refund).
Example: { customer_id: 'C-1001', reason: 'Refund PKR 75,000 exceeds limit' }`,
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                reason: { type: "string" },
                refund_amount: { type: ["number", "null"] }
            },
            required: ["customer_id", "reason"]
        }
    },
    {
        name: "check_api_status",
        description: `Checks health and status of a customer's API integration.
Returns: endpoint, status (operational/degraded/outage), latency_ms, uptime.
Use when: customer reports API errors, authentication failures, SDK issues.
Do NOT use for: billing disputes (use get_invoice), returns (use lookup_order).
Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"]
        }
    },
    {
        name: "get_error_logs",
        description: `Retrieves API error logs for a customer's integration.
Returns: logs array with timestamp, error_code, error_message, endpoint.
Use when: diagnosing repeated API failures, identifying error patterns.
Do NOT use for: billing issues (use check_payment_history), returns.
Example: { customer_id: 'C-1001' }`,
        input_schema: {
            type: "object",
            properties: { customer_id: { type: "string" } },
            required: ["customer_id"]
        }
    }
]

// ── Agent-specific filtered tool sets ────────────────────────────

export const AGENT_TOOL_SCOPES = {
    billing: [
        'get_customer',
        'get_invoice',
        'check_payment_history',
        'process_refund',
        'escalate_to_human'
    ],
    returns: [
        'get_customer',
        'lookup_order',
        'check_return_eligibility',
        'escalate_to_human'
    ],
    technical: [
        'get_customer',
        'check_api_status',
        'get_error_logs',
        'escalate_to_human'
    ],
    // Overloaded agent — for comparison testing
    overloaded: ALL_TOOL_DEFINITIONS.map(t => t.name)
}

// ── Filter function ───────────────────────────────────────────────
export function getToolsForAgent(agentRole) {
    const allowedNames = AGENT_TOOL_SCOPES[agentRole]
    if (!allowedNames) throw new Error(`Unknown agent role: ${agentRole}`)

    return ALL_TOOL_DEFINITIONS.filter(t => allowedNames.includes(t.name))
}