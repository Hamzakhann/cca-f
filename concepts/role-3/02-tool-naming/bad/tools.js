// bad/tools.js
// These names look reasonable. They are not.
// Each one violates at least one naming rule.

export const BAD_NAMED_TOOLS = [
    {
        name: "get_data",
        description: `Gets data for a customer or order.

Returns: varies depending on what is requested — could be
customer profile fields or order details.

Use when: you need information about a customer or their orders.

Example: { type: 'customer', id: 'C-1001' }
         { type: 'order', id: 'ORD-5001' }`,
        input_schema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["customer", "order"],
                    description: "What type of data to retrieve"
                },
                id: {
                    type: "string",
                    description: "The ID of the customer or order"
                }
            },
            required: ["type", "id"]
        }
    },

    {
        name: "handle_payment",
        description: `Handles payment-related operations for a customer.

Returns: payment history, refund confirmation, or invoice data
depending on the operation requested.

Use when: any payment operation is needed.

Example: { operation: 'history', customer_id: 'C-1001' }
         { operation: 'refund', customer_id: 'C-1001', amount: 12500 }`,
        input_schema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    enum: ["history", "refund", "invoice"],
                    description: "The payment operation to perform"
                },
                customer_id: { type: "string" },
                amount: { type: "number" }
            },
            required: ["operation", "customer_id"]
        }
    },

    {
        name: "manage_support",
        description: `Manages support actions including returns and escalations.

Returns: return eligibility result or escalation ticket depending
on the action.

Use when: handling returns or needing to escalate.

Example: { action: 'check_return', order_id: 'ORD-5001', days: 12 }
         { action: 'escalate', customer_id: 'C-1001', reason: 'policy gap' }`,
        input_schema: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["check_return", "escalate"]
                },
                customer_id: { type: "string" },
                order_id: { type: "string" },
                days: { type: "number" },
                reason: { type: "string" }
            },
            required: ["action"]
        }
    }
]