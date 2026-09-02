// schemas/bad-schema.js
// Every field is required with a concrete type.
// Looks thorough. Causes fabrication on sparse inputs.

export const BAD_EXTRACTION_TOOL = {
    name: "extract_support_issue",
    description: `Extracts structured data from a customer support
message to route it to the correct specialist agent.

Returns structured issue data with all fields populated.

Example: customer saying "I was double charged PKR 12,500
on invoice INV-1001" → issue_type: billing, amount: 12500`,
    input_schema: {
        type: "object",
        required: [
            "issue_type",
            "severity",
            "action_required",
            "customer_id",      // ← PROBLEM: required but might not exist
            "amount_pkr",       // ← PROBLEM: required but might not be mentioned
            "order_id",         // ← PROBLEM: required but might not be mentioned
            "invoice_id",       // ← PROBLEM: required but might not be mentioned
            "confidence"
        ],
        properties: {
            issue_type: {
                type: "string",
                enum: ["billing", "returns", "technical", "other"]
            },
            severity: {
                type: "string",
                enum: ["high", "medium", "low"]
            },
            action_required: {
                type: "string",
                enum: ["refund", "return", "escalate", "investigate", "inform"]
            },
            customer_id: {
                type: "string",          // ← PROBLEM: forces fabrication
                description: "Customer ID"
            },
            amount_pkr: {
                type: "number",          // ← PROBLEM: forces fabrication
                description: "Amount in PKR"
            },
            order_id: {
                type: "string",          // ← PROBLEM: forces fabrication
                description: "Order ID"
            },
            invoice_id: {
                type: "string",          // ← PROBLEM: forces fabrication
                description: "Invoice ID"
            },
            confidence: {
                type: "number",
                minimum: 0,
                maximum: 1
            }
        }
    }
}