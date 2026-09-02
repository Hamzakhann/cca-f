import { HumanReviewQueue } from "./humanQueue.js";
import { AccuracyTracker } from "./accuracyTracker.js";
import { StratifiedSampler } from "./stratifiedSampler.js";

function testHumanQueue() {
  console.log("==========================================");
  console.log("  TEST 1: HumanReviewQueue Routing  ");
  console.log("==========================================");

  const queue = new HumanReviewQueue();

  const extractions = [
    {
      extraction_id: "ext-1",
      customer_id: "C-1001",
      issue_type: "billing",
      issue_type_confidence: 0.95,
      severity: "high",
      action_required: "refund",
      action_required_confidence: 0.92,
      amount_pkr: 12500,
      escalation_requested: false,
      confidence: 0.94,
    },
    {
      extraction_id: "ext-2",
      customer_id: "C-1002",
      issue_type: "returns",
      issue_type_confidence: 0.85,
      severity: "medium",
      action_required: "return",
      action_required_confidence: 0.82,
      amount_pkr: 5000,
      escalation_requested: false,
      confidence: 0.62, // Low overall confidence (< 0.75)
    },
    {
      extraction_id: "ext-3",
      customer_id: "C-1003",
      issue_type: "billing",
      issue_type_confidence: 0.90,
      severity: "high",
      action_required: "refund",
      action_required_confidence: 0.70, // Low critical field confidence (< 0.80)
      amount_pkr: 8500,
      escalation_requested: false,
      confidence: 0.88,
    },
    {
      extraction_id: "ext-4",
      customer_id: "C-1004",
      issue_type: "billing",
      issue_type_confidence: 0.90,
      severity: "high",
      action_required: "inform", // Conflicting signal: escalation_requested true but action_required 'inform'
      action_required_confidence: 0.90,
      amount_pkr: 3000,
      escalation_requested: true,
      confidence: 0.89,
    },
    {
      extraction_id: "ext-5",
      customer_id: null, // Missing customer_id for refund
      issue_type: "billing",
      issue_type_confidence: 0.92,
      severity: "high",
      action_required: "refund",
      action_required_confidence: 0.91,
      amount_pkr: 15000,
      escalation_requested: false,
      confidence: 0.90,
    },
    {
      extraction_id: "ext-6",
      customer_id: "C-1006",
      issue_type: "technical",
      issue_type_confidence: 0.96,
      severity: "medium",
      action_required: "investigate",
      action_required_confidence: 0.95,
      amount_pkr: null,
      escalation_requested: false,
      confidence: 0.96,
    },
  ];

  const expectedRoutes = [
    "automated",
    "human_review",
    "human_review",
    "human_review",
    "human_review",
    "automated",
  ];

  let passed = 0;

  extractions.forEach((ext, idx) => {
    const result = queue.route(ext);
    const isPass = result.route === expectedRoutes[idx];
    console.log(
      `Case ${idx + 1} (${ext.extraction_id}): Predicted='${expectedRoutes[idx]}', Actual='${result.route}' — ${isPass ? "✅ PASS" : "❌ FAIL"}`
    );
    if (isPass) passed++;
  });

  const stats = queue.getQueueStats();
  console.log("\nQueue Statistics:", JSON.stringify(stats, null, 2));

  return passed === extractions.length;
}

function testAccuracyTracker() {
  console.log("\n==========================================");
  console.log("  TEST 2: AccuracyTracker Segment Auditing  ");
  console.log("==========================================");

  const tracker = new AccuracyTracker();

  // Record 1: Billing Correct
  tracker.record(
    {
      issue_type: "billing",
      severity: "high",
      action_required: "refund",
      customer_id: "C-1001",
      amount_pkr: 12500,
    },
    {
      issue_type: "billing",
      severity: "high",
      action_required: "refund",
      customer_id: "C-1001",
      amount_pkr: 12500,
    }
  );

  // Record 2: Billing Correct
  tracker.record(
    {
      issue_type: "billing",
      severity: "medium",
      action_required: "refund",
      customer_id: "C-1002",
      amount_pkr: 8500,
    },
    {
      issue_type: "billing",
      severity: "medium",
      action_required: "refund",
      customer_id: "C-1002",
      amount_pkr: 8500,
    }
  );

  // Record 3: Billing Wrong (action_required extracted as 'refund', ground truth is 'inform')
  tracker.record(
    {
      issue_type: "billing",
      severity: "low",
      action_required: "refund",
      customer_id: "C-1003",
      amount_pkr: 2000,
    },
    {
      issue_type: "billing",
      severity: "low",
      action_required: "inform",
      customer_id: "C-1003",
      amount_pkr: 2000,
    }
  );

  const report = tracker.getReport();
  console.log("Accuracy Report:", JSON.stringify(report, null, 2));

  const billingAcc = Math.round(report.by_issue_type.billing * 100);
  const actionAcc = Math.round(report.by_field.action_required * 100);
  const isSafe = report.automation_safe;

  console.log(`\nBilling Segment Accuracy: ${billingAcc}% (Expected 67%)`);
  console.log(`Action Required Field Accuracy: ${actionAcc}% (Expected 67%)`);
  console.log(`Automation Safe: ${isSafe} (Expected false)`);

  const isPass = billingAcc === 67 && actionAcc === 67 && isSafe === false;
  console.log(`AccuracyTracker Audit Test: ${isPass ? "✅ PASS" : "❌ FAIL"}`);

  return isPass;
}

function testStratifiedSampler() {
  console.log("\n==========================================");
  console.log("  TEST 3: StratifiedSampler Audit Sampling  ");
  console.log("==========================================");

  const sampler = new StratifiedSampler(10);

  // Ingest 15 billing, 8 returns, 3 technical extractions (26 total)
  for (let i = 1; i <= 15; i++) {
    sampler.ingest({ extraction_id: `b-${i}`, issue_type: "billing" });
  }
  for (let i = 1; i <= 8; i++) {
    sampler.ingest({ extraction_id: `r-${i}`, issue_type: "returns" });
  }
  for (let i = 1; i <= 3; i++) {
    sampler.ingest({ extraction_id: `t-${i}`, issue_type: "technical" });
  }

  const counts = sampler.getStratumCounts();
  console.log("Ingested Stratum Counts:", JSON.stringify(counts, null, 2));

  const sample = sampler.getSample();
  console.log(`Total Sampled Items: ${sample.length} (Expected 21)`);

  const billingSampleCount = sample.filter((e) => e._stratum === "billing").length;
  const returnsSampleCount = sample.filter((e) => e._stratum === "returns").length;
  const technicalSampleCount = sample.filter((e) => e._stratum === "technical").length;

  console.log(
    `Breakdown: Billing=${billingSampleCount} (exp 10), Returns=${returnsSampleCount} (exp 8), Technical=${technicalSampleCount} (exp 3)`
  );

  const isSamplePass =
    sample.length === 21 &&
    billingSampleCount === 10 &&
    returnsSampleCount === 8 &&
    technicalSampleCount === 3;

  console.log(`StratifiedSampler Test: ${isSamplePass ? "✅ PASS" : "❌ FAIL"}`);

  return isSamplePass;
}

function runWorkflowTests() {
  const pass1 = testHumanQueue();
  const pass2 = testAccuracyTracker();
  const pass3 = testStratifiedSampler();

  console.log("\n==========================================");
  console.log(
    `OVERALL REVIEW WORKFLOW SUITE: ${pass1 && pass2 && pass3 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`
  );
  console.log("==========================================");
}

runWorkflowTests();
