import { runBillingAgent } from "../agents/billingAgent.js";

async function runIntegrationTest() {
  console.log("==========================================");
  console.log("     INTEGRATION STRESS TEST (HOOKS)      ");
  console.log("==========================================");

  // Scenario A: Small refund (PKR 12,500 — should process automatically)
  console.log("\n--- SCENARIO A: Small Refund (PKR 12,500) ---");
  const resultA = await runBillingAgent(`
  Customer ID: C-1001
  Invoice ID: INV-1001
  Issue: confirmed double charge
  Refund amount: PKR 12,500
  Task: process the refund for the duplicate payment
`);
  console.log("\n[Final Output - Scenario A]");
  console.log(resultA);

  // Scenario B: Large refund (PKR 75,000 — should be blocked and escalated)
  console.log("\n------------------------------------------");
  console.log("--- SCENARIO B: Large Refund (PKR 75,000) ---");
  console.log("------------------------------------------");
  const resultB = await runBillingAgent(`
  Customer ID: C-1002
  Invoice ID: INV-2002
  Issue: customer claims PKR 75,000 overcharge on enterprise contract
  Refund amount: PKR 75,000
  Task: process the refund if warranted
`);
  console.log("\n[Final Output - Scenario B]");
  console.log(resultB);

  console.log("\n==========================================");
  console.log("      INTEGRATION STRESS TEST COMPLETE    ");
  console.log("==========================================");
}

runIntegrationTest().catch((err) => {
  console.error("Integration Test Error:", err);
  process.exit(1);
});