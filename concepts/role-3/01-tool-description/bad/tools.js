// bad/tools.js
// These are the descriptions most developers actually write.
// They look fine. They are not fine.

export const BAD_TOOLS = [
    {
        name: "get_customer",
        description: "Gets customer information",
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },
    {
        name: "lookup_order",
        description: "Looks up order information",
        input_schema: {
            type: "object",
            properties: {
                order_id: { type: "string" }
            },
            required: ["order_id"]
        }
    },
    {
        name: "check_payment_history",
        description: "Checks payment history",
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" }
            },
            required: ["customer_id"]
        }
    },
    {
        name: "process_refund",
        description: "Processes a refund",
        input_schema: {
            type: "object",
            properties: {
                customer_id: { type: "string" },
                amount: { type: "number" }
            },
            required: ["customer_id", "amount"]
        }
    }
]