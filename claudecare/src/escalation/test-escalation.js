import { evaluateEscalation } from "./escalationEngine.js";

const mockFacts = {
  customer_id: "C-1001",
  billing: {
    invoice_id: "INV-1001",
    duplicate_amount_pkr: 12500,
    duplicate_payment_id: "PAY-8002",
  },
  returns: null,
  customer_expectations: [{ stated: "resolve within 3 days" }],
};

const testCases = [
  {
    name: "Case 1: Explicit customer demand for human",
    input: {
      customerMessage: "I want to speak to a manager",
      caseFacts: mockFacts,
      resolutionAttempts: 0,
      hasPolicyGap: false,
    },
    expected: { shouldEscalate: true, trigger: "customer_demand" },
  },
  {
    name: "Case 2: Policy gap trigger",
    input: {
      customerMessage: "Can I request a custom extension on my return?",
      caseFacts: mockFacts,
      resolutionAttempts: 0,
      hasPolicyGap: true,
    },
    expected: { shouldEscalate: true, trigger: "policy_gap" },
  },
  {
    name: "Case 3: Max resolution attempts reached (3/3)",
    input: {
      customerMessage: "Still having issues with my invoice.",
      caseFacts: mockFacts,
      resolutionAttempts: 3,
      hasPolicyGap: false,
    },
    expected: { shouldEscalate: true, trigger: "max_attempts" },
  },
  {
    name: "Case 4: Angry sentiment only (No structural trigger)",
    input: {
      customerMessage: "THIS IS RIDICULOUS I AM SO ANGRY",
      caseFacts: mockFacts,
      resolutionAttempts: 0,
      hasPolicyGap: false,
    },
    expected: { shouldEscalate: false, trigger: null },
  },
  {
    name: "Case 5: Normal automated query within scope",
    input: {
      customerMessage: "Can you please check invoice INV-1001?",
      caseFacts: mockFacts,
      resolutionAttempts: 0,
      hasPolicyGap: false,
    },
    expected: { shouldEscalate: false, trigger: null },
  },
  {
    name: "Case 6: Attempts below maximum threshold (2/3)",
    input: {
      customerMessage: "Let me try again.",
      caseFacts: mockFacts,
      resolutionAttempts: 2,
      hasPolicyGap: false,
    },
    expected: { shouldEscalate: false, trigger: null },
  },
];

function runTests() {
  console.log("==========================================");
  console.log("  ESCALATION ENGINE STRUCTURAL TEST RUN  ");
  console.log("==========================================");

  let passed = 0;
  let failed = 0;

  testCases.forEach((tc, idx) => {
    console.log(`\n--- Test ${idx + 1}: ${tc.name} ---`);
    const actual = evaluateEscalation(tc.input);

    const matchShouldEscalate =
      actual.shouldEscalate === tc.expected.shouldEscalate;
    const matchTrigger = actual.trigger === tc.expected.trigger;
    const isPass = matchShouldEscalate && matchTrigger;

    console.log(
      `Prediction: shouldEscalate=${tc.expected.shouldEscalate}, trigger=${tc.expected.trigger}`
    );
    console.log(
      `Actual:     shouldEscalate=${actual.shouldEscalate}, trigger=${actual.trigger}`
    );
    console.log(`Status:     ${isPass ? "✅ PASS" : "❌ FAIL"}`);

    if (isPass) {
      passed++;
    } else {
      failed++;
    }

    if (actual.shouldEscalate) {
      console.log("Handoff payload validation:");
      const handoff = actual.handoff;
      const fields = [
        "customer_id",
        "trigger",
        "billing_summary",
        "priority",
        "recommended_action",
        "handoff_timestamp",
      ];
      const missing = fields.filter((f) => handoff[f] === undefined);

      if (missing.length === 0) {
        console.log("  Handoff completeness: ✅ ALL REQUIRED FIELDS PRESENT");
      } else {
        console.log(`  Handoff completeness: ❌ MISSING FIELDS: ${missing.join(", ")}`);
      }
    }
  });

  console.log("\n==========================================");
  console.log(`Summary: ${passed}/${testCases.length} tests passed (${failed} failed)`);
  console.log("==========================================");
}

runTests();
