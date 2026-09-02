// schemas/good-schema.js
// Each field type chosen using the decision framework.
// Nullable for absent-but-meaningful. Optional for defaults.
// Required only for what the tool truly cannot run without.

export const GOOD_EXTRACTION_TOOL = {
    name: "extract_support_issue",
    description: `Extracts structured data from a customer support
message to route it to the correct specialist agent.

For fields marked nullable: explicitly set to null when the
information is not present in the message — do NOT fabricate
values. A null value is meaningful — it tells the system the
customer did not provide that information.

Returns structured issue data with honest null values
where information is absent.`,
    input_schema: {
        type: "object",
        required: [
            "issue_type",        // Always derivable — routing impossible without
            "severity",          // Always derivable — always a best estimate
            "action_required",   // Always derivable — always a best estimate
            "customer_id",       // nullable — MUST know if absent
            "amount_pkr",        // nullable — MUST know if absent
            "order_id",          // nullable — MUST know if absent
            "invoice_id",        // nullable — MUST know if absent
            "escalation_requested", // always derivable from message
            "confidence"         // always producible
        ],
        properties: {
            issue_type: {
                type: "string",
                enum: ["billing", "returns", "technical", "other"],
                description: "Primary category. Use 'other' if unclear."
            },
            issue_type_detail: {
                type: "string",
                // NOT in required — optional, only needed when issue_type is 'other'
                description: "Optional. Required only when issue_type is 'other' — describe specifically."
            },
            severity: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "high: financial loss or explicit demand. medium: unclear or degraded. low: inquiry."
            },
            action_required: {
                type: "string",
                enum: ["refund", "return", "escalate", "investigate", "inform"],
                description: "Primary action the agent should take."
            },
            customer_id: {
                type: ["string", "null"],  // ← nullable: absence is meaningful
                description: "Customer ID (C-XXXX) if stated by customer. Set null if not mentioned — do NOT fabricate."
            },
            amount_pkr: {
                type: ["number", "null"],  // ← nullable: absence is meaningful
                description: "PKR amount if mentioned. Set null if no amount stated — do NOT invent an amount."
            },
            order_id: {
                type: ["string", "null"],  // ← nullable: absence is meaningful
                description: "Order ID (ORD-XXXX) if mentioned. Set null if not referenced."
            },
            invoice_id: {
                type: ["string", "null"],  // ← nullable: absence is meaningful
                description: "Invoice ID (INV-XXXX) if mentioned. Set null if not referenced."
            },
            escalation_requested: {
                type: "boolean",
                description: "true only if customer explicitly requests a human agent."
            },
            confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Your confidence in this extraction 0.0-1.0."
            }
        }
    }
}