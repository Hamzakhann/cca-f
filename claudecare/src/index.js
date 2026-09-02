import { extractIssueWithReview } from "./extraction/issueExtractor.js";
import { HumanReviewQueue } from "./review/humanQueue.js";
import { AccuracyTracker } from "./review/accuracyTracker.js";
import { StratifiedSampler } from "./review/stratifiedSampler.js";
import { runCoordinator } from "./agents/coordinator.js";
import { evaluateEscalation } from "./escalation/escalationEngine.js";
import { ProvenanceTracker } from "./provenance/provenanceTracker.js";

/**
 * Master orchestration entry point for ClaudeCare support ticket resolution.
 * Executes the full end-to-end pipeline across Extraction, Human Review Routing,
 * Coordinator Dispatch, Escalation Evaluation, Provenance Tracking, and Accuracy Auditing.
 *
 * @param {string} customerMessage - Raw intake support inquiry.
 * @param {string} customerId - Customer identifier string.
 * @returns {Promise<Object>} Final resolution result object containing telemetry across all domains.
 */
export async function resolveTicket(customerMessage, customerId = "C-1001") {
  console.log("\n" + "=".repeat(50));
  console.log("CLAUDECARE RESOLUTION ENGINE");
  console.log("=".repeat(50));
  console.log("Customer:", customerId);
  console.log("Message:", customerMessage.slice(0, 80) + "...");

  // ── STEP 1: EXTRACTION (Domain 4) ────────────────
  console.log("\n[Step 1] Issue Extraction (Domain 4)");
  const extraction = await extractIssueWithReview(customerMessage);
  console.log("  issue_type:", extraction.issue_type);
  console.log("  severity:", extraction.severity);
  console.log("  confidence:", extraction.confidence);

  // ── STEP 2: HUMAN REVIEW ROUTING (Domain 5) ──────
  console.log("\n[Step 2] Human Review Routing (Domain 5)");
  const queue = new HumanReviewQueue();
  const routingDecision = queue.route({
    ...extraction,
    extraction_id: `ext-${Date.now()}`,
    customer_id: extraction.customer_id || customerId,
    action_required_confidence: extraction.confidence,
    issue_type_confidence: extraction.confidence,
  });
  console.log("  Route:", routingDecision.route);
  if (routingDecision.route === "human_review") {
    console.log("  Reason:", routingDecision.reason);
    console.log("  [HALTING] Routing to human review queue");
    return {
      status: "human_review_required",
      routing_decision: routingDecision,
      extraction,
    };
  }

  // ── STEP 3: COORDINATOR RESOLUTION (Domain 1 + 2) ────
  console.log("\n[Step 3] Coordinator Resolution (Domain 1 + 2)");
  const resolution = await runCoordinator(customerMessage, customerId);

  // ── STEP 4: ESCALATION CHECK (Domain 5) ──────────
  console.log("\n[Step 4] Escalation Evaluation (Domain 5)");

  // Build case facts from extraction for escalation context
  const caseFacts = {
    customer_id: customerId,
    billing: extraction.invoice_id
      ? {
          invoice_id: extraction.invoice_id,
          duplicate_amount_pkr: extraction.amount_pkr,
        }
      : null,
    returns: extraction.order_id
      ? {
          order_id: extraction.order_id,
        }
      : null,
    customer_expectations: [],
  };

  const escalationDecision = evaluateEscalation({
    customerMessage,
    caseFacts,
    resolutionAttempts: 0,
    hasPolicyGap: false,
  });
  console.log("  Should escalate:", escalationDecision.shouldEscalate);
  console.log("  Trigger:", escalationDecision.trigger || "none");

  // ── STEP 5: PROVENANCE REPORT (Domain 5) ─────────
  console.log("\n[Step 5] Provenance Tracking (Domain 5)");
  const provenance = new ProvenanceTracker();

  // Record key claims from the resolution
  if (extraction.invoice_id) {
    const tcId = provenance.recordToolCall(
      "get_invoice",
      { invoice_id: extraction.invoice_id },
      { amount: extraction.amount_pkr }
    );
    provenance.addClaim(
      {
        claim: `Invoice amount PKR ${extraction.amount_pkr}`,
        claim_type: "invoice_amount",
      },
      tcId,
      extraction.confidence
    );
  }
  const provenanceReport = provenance.getProvenanceReport();
  console.log("  Claims tracked:", provenanceReport.total_claims);
  console.log("  Conflicts:", provenanceReport.conflicted);

  // ── STEP 6: ACCURACY TRACKING (Domain 5) ─────────
  console.log("\n[Step 6] Accuracy + Sampling (Domain 5)");
  const tracker = new AccuracyTracker();
  const sampler = new StratifiedSampler();
  sampler.ingest(extraction);
  console.log("  Extraction ingested for stratified sampling");
  console.log("  Stratum counts:", sampler.getStratumCounts());

  // ── FINAL REPORT ──────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log("RESOLUTION COMPLETE");
  console.log("=".repeat(50));

  return {
    status: "resolved",
    extraction,
    routing_decision: routingDecision,
    escalation: escalationDecision,
    provenance: provenanceReport,
    resolution_summary: resolution?.slice(0, 200) + "...",
  };
}

// ── RUN THE SIMULATION ────────────────────────────
const SIMULATION_MESSAGE =
  `Hi, I am customer C-1001. I noticed I was charged PKR 12,500 twice on invoice INV-1001 on two consecutive days — PAY-8001 and PAY-8002. I also want to return my Wireless Headphones from order ORD-5001 which I bought 12 days ago. Please help with both issues.`;

resolveTicket(SIMULATION_MESSAGE, "C-1001")
  .then((result) => {
    console.log("\nFinal result status:", result.status);
    process.exit(0);
  })
  .catch((err) => {
    console.error("RESOLUTION ERROR:", err);
    process.exit(1);
  });
