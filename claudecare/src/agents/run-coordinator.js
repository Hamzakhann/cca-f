import { runCoordinator } from "./coordinator.js";

async function runTestScenarios() {
  console.log("==========================================");
  console.log("  CLAUDECARE COORDINATOR AGENT TEST RUN   ");
  console.log("==========================================");

  // Scenario 1: Billing-only query
  console.log("\n------------------------------------------");
  console.log("SCENARIO 1: Billing-Only Query");
  console.log("------------------------------------------");
  const billingMessage = "Hi, I am customer C-1001. I noticed a double charge of PKR 12,500 on my invoice INV-1001 for two days in a row. Can you please check and refund?";
  const billingResolution = await runCoordinator(billingMessage);
  console.log("\n[Final Customer Resolution - Scenario 1]");
  console.log(billingResolution);

  // Scenario 2: Returns-only query
  console.log("\n------------------------------------------");
  console.log("SCENARIO 2: Returns-Only Query");
  console.log("------------------------------------------");
  const returnsMessage = "Hello, I bought Wireless Headphones on order ORD-5001 on August 1st (12 days ago). I would like to return them. Am I eligible?";
  const returnsResolution = await runCoordinator(returnsMessage);
  console.log("\n[Final Customer Resolution - Scenario 2]");
  console.log(returnsResolution);

  // Scenario 3: Both Billing AND Returns query (Parallel)
  console.log("\n------------------------------------------");
  console.log("SCENARIO 3: Parallel Billing & Returns Query");
  console.log("------------------------------------------");
  const dualMessage = "Hi ClaudeCare support, customer C-1001 here. First, I was double charged PKR 12,500 on invoice INV-1001. Second, I also want to return my Wireless Headphones from order ORD-5001 purchased 12 days ago. Please assist with both!";
  const dualResolution = await runCoordinator(dualMessage);
  console.log("\n[Final Customer Resolution - Scenario 3]");
  console.log(dualResolution);

  // Scenario 4: Technical Support Query
  console.log("\n------------------------------------------");
  console.log("SCENARIO 4: Technical Support Query");
  console.log("------------------------------------------");
  const techMessage = "Hello, I am customer C-1001. We are experiencing API authentication token expiration errors when calling endpoint auth-v1. Could you check our error logs and check API status?";
  const techResolution = await runCoordinator(techMessage);
  console.log("\n[Final Customer Resolution - Scenario 4]");
  console.log(techResolution);

  console.log("\n==========================================");
  console.log("  ALL SCENARIOS COMPLETED SUCCESSFULLY   ");
  console.log("==========================================");
}

runTestScenarios().catch((err) => {
  console.error("Coordinator Test Error:", err);
  process.exit(1);
});
