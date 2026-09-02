import { submitTicketBatch } from "./ticketBatcher.js";
import { pollBatch } from "./batchPoller.js";

const mockTickets = [
  {
    id: "ticket-001",
    message:
      "I was charged PKR 12,500 twice on invoice INV-1001. Customer C-1001. Please refund.",
  },
  {
    id: "ticket-002",
    message:
      "I want to return my headphones from order ORD-5001. Bought 8 days ago.",
  },
  {
    id: "ticket-003",
    message:
      "This is outrageous. I demand a senior manager NOW. I've been waiting 5 days.",
  },
  {
    id: "ticket-004",
    message:
      "Quick question — what is your return policy for electronics?",
  },
  {
    id: "ticket-005",
    message:
      "Our API integration keeps getting 401 errors. Customer C-1003. SDK version 2.1.",
  },
];

async function runTest() {
  console.log("Submitting ticket batch...");
  const { batch_id } = await submitTicketBatch(mockTickets);
  console.log(`Batch submitted: ${batch_id}`);

  console.log("\nPolling for batch completion...");
  const results = await pollBatch(batch_id, 10);

  console.log("\nResults Table:");
  const tableData = results.succeeded.map((item) => ({
    custom_id: item.custom_id,
    issue_type: item.extraction.issue_type,
    severity: item.extraction.severity,
    action_required: item.extraction.action_required,
    confidence: item.extraction.confidence,
  }));
  console.table(tableData);

  console.log(
    `\nSummary: ${results.summary.succeeded}/${results.summary.total} succeeded, ${results.summary.failed} failed`
  );

  if (results.failed.length > 0) {
    console.log(
      "Failed custom_ids:",
      results.failed.map((f) => f.custom_id).join(", ")
    );
  }
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
});
