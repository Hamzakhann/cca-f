import { ProvenanceTracker } from "./provenanceTracker.js";

function runProvenanceTest() {
  console.log("==========================================");
  console.log("  PROVENANCE TRACKER TEST RUN  ");
  console.log("==========================================");

  const tracker = new ProvenanceTracker();

  // 1. Record 3 tool calls
  const tc1 = tracker.recordToolCall(
    "get_invoice",
    { invoice_id: "INV-1001" },
    { amount: 12500, currency: "PKR" }
  );
  const tc2 = tracker.recordToolCall(
    "check_payment_history",
    { customer_id: "C-1001" },
    { duplicate_detected: true, payment_count: 2 }
  );
  const tc3 = tracker.recordToolCall(
    "check_return_eligibility",
    { order_id: "ORD-5001" },
    { eligible: true, days_remaining: 18 }
  );

  // 2. Add 3 claims from those tool calls
  tracker.addClaim(
    { claim_type: "invoice_amount", claim: "PKR 12,500" },
    tc1
  );
  tracker.addClaim(
    { claim_type: "billing_issue", claim: "duplicate payment detected" },
    tc2
  );
  tracker.addClaim(
    { claim_type: "return_eligibility", claim: "eligible with 18 days remaining" },
    tc3
  );

  // 3. Add a conflicting claim (different invoice_amount from another tool call)
  const tc4 = tracker.recordToolCall(
    "get_invoice_v2",
    { invoice_id: "INV-1001" },
    { amount: 15000, currency: "PKR" }
  );
  tracker.addClaim(
    { claim_type: "invoice_amount", claim: "PKR 15,000" },
    tc4
  );

  // 4. Verify report
  const report = tracker.getProvenanceReport();
  console.log("\nProvenance Report Summary:");
  console.log(`Total Claims:   ${report.total_claims} (Expected 4)`);
  console.log(`Well Supported: ${report.well_supported} (Expected 3)`);
  console.log(`Conflicted:     ${report.conflicted} (Expected 1)`);
  console.log(`Low Confidence: ${report.low_confidence} (Expected 0)`);

  console.log("\nSynthesis Context:");
  console.log(report.synthesis_context);

  const hasConflictAnnotation = report.synthesis_context.includes("⚠️ CONFLICT");
  const isPass =
    report.total_claims === 4 &&
    report.well_supported === 3 &&
    report.conflicted === 1 &&
    hasConflictAnnotation;

  console.log(`\nProvenance Test: ${isPass ? "✅ PASS" : "❌ FAIL"}`);
}

runProvenanceTest();
