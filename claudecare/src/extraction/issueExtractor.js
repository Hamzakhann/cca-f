import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const client = new Anthropic();

const issueSchema = JSON.parse(
  fs.readFileSync(new URL("../../schemas/issueSchema.json", import.meta.url), "utf-8")
);

export const extractionTool = {
  name: "extract_support_issue",
  description:
    "Extracts structured data from a customer support message to route it to the correct specialist agent",
  input_schema: issueSchema,
};

const systemPrompt = `You are a customer support issue extraction assistant. Your job is to analyze incoming customer support messages and extract structured metadata using the extract_support_issue tool.

Always use the extract_support_issue tool to return your response.

Here are examples of how to classify incoming customer support messages:

Example 1 — billing dispute with amount and invoice:
Message: "I was double charged PKR 8,500 on my invoice INV-2002"
Extracted Result:
{
  "issue_type": "billing",
  "issue_type_detail": null,
  "customer_id": null,
  "severity": "high",
  "action_required": "refund",
  "amount_pkr": 8500,
  "order_id": null,
  "invoice_id": "INV-2002",
  "escalation_requested": false,
  "confidence": 0.95
}

Example 2 — return request with order:
Message: "I want to return my headphones from order ORD-5001, bought 12 days ago"
Extracted Result:
{
  "issue_type": "returns",
  "issue_type_detail": null,
  "customer_id": null,
  "severity": "medium",
  "action_required": "return",
  "amount_pkr": null,
  "order_id": "ORD-5001",
  "invoice_id": null,
  "escalation_requested": false,
  "confidence": 0.92
}

Example 3 — ambiguous angry message with no specifics:
Message: "Your service is terrible and I want my money back"
Extracted Result:
{
  "issue_type": "billing",
  "issue_type_detail": null,
  "customer_id": null,
  "severity": "medium",
  "action_required": "investigate",
  "amount_pkr": null,
  "order_id": null,
  "invoice_id": null,
  "escalation_requested": false,
  "confidence": 0.45
}
Reasoning: An angry tone does not determine issue_type; "money back" suggests billing, but no specifics (invoice ID, order ID, exact amount) are given — set confidence low (0.45).`;

/**
 * Extracts structured issue details from a customer support message using forced tool choice.
 *
 * @param {string} message - The raw customer support message.
 * @returns {Promise<Object>} The extracted structured issue object matching issueSchema.json.
 */
export async function extractIssue(message) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
    tools: [extractionTool],
    tool_choice: { type: "tool", name: "extract_support_issue" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Model failed to call extract_support_issue tool");
  }

  return toolUse.input;
}

/**
 * Extracts structured issue details and flags low confidence (< 0.7) for human review.
 *
 * @param {string} message - The raw customer support message.
 * @returns {Promise<Object>} The extracted object augmented with `needs_human_review`.
 */
export async function extractIssueWithReview(message) {
  const extraction = await extractIssue(message);
  if (extraction.confidence < 0.7) {
    console.log("LOW CONFIDENCE extraction — routing to human review");
    return { ...extraction, needs_human_review: true };
  }
  return { ...extraction, needs_human_review: false };
}
