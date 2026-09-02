import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const client = new Anthropic();

export const BATCH_SYSTEM_PROMPT = `You are a ClaudeCare support ticket classifier. Analyse the
support message and classify it into exactly this JSON structure:
{
  issue_type: 'billing' | 'returns' | 'technical' | 'other',
  severity: 'high' | 'medium' | 'low',
  action_required: 'refund' | 'return' | 'escalate' |
                   'investigate' | 'inform',
  customer_id: string or null,
  amount_pkr: number or null,
  order_id: string or null,
  invoice_id: string or null,
  escalation_requested: boolean,
  confidence: number between 0 and 1
}

Respond ONLY with the JSON object. No explanation.
No markdown. No code fences. Pure JSON only.

Severity guide:
- high: financial loss, service outage, explicit escalation demand
- medium: degraded service, unclear issue, multiple interactions needed
- low: general inquiry, information request`;

/**
 * Submits a batch of support tickets to the Anthropic Message Batches API.
 *
 * @param {Array<{id: string, message: string}>} tickets - Array of support tickets.
 * @returns {Promise<{batch_id: string, ticket_count: number}>} The submitted batch ID and ticket count.
 */
export async function submitTicketBatch(tickets) {
  const requests = tickets.map((ticket) => ({
    custom_id: ticket.id,
    params: {
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: BATCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: ticket.message }],
    },
  }));

  const batch = await client.beta.messages.batches.create({ requests });

  const date = new Date().toISOString().split("T")[0];
  const logDir = path.resolve(".claude");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `batch-log-${date}.json`);
  const logData = {
    batch_id: batch.id,
    submitted_at: new Date().toISOString(),
    ticket_count: tickets.length,
    custom_ids: tickets.map((t) => t.id),
    status: "processing",
  };

  fs.writeFileSync(logFile, JSON.stringify(logData, null, 2), "utf-8");

  console.log(`Batch submitted: ${batch.id} | ${tickets.length} tickets`);

  return {
    batch_id: batch.id,
    ticket_count: tickets.length,
  };
}
