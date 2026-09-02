// PREDICT: { escalated: true, ticket_id: "TKT-XXX", assigned_to: "Senior Billing Agent", priority: "high", estimated_response_hours: 4 }
import { definition, executor } from "../escalate_to_human.js";

async function runTests() {
  console.log("==========================================");
  console.log("    ESCALATE_TO_HUMAN MCP TOOL TEST       ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: High priority escalation (PKR 75,000 > 50,000) ---");
  const res1 = await executor({
    customer_id: "C-1001",
    reason: "Refund of PKR 75,000 exceeds automated limit",
    refund_amount: 75000,
  });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Standard priority escalation ---");
  const res2 = await executor({
    customer_id: "C-1001",
    reason: "Customer explicitly requested human escalation",
  });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Validation Error (Empty reason) ---");
  const res3 = await executor({
    customer_id: "C-1001",
    reason: "   ",
  });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Business Error (Unknown Customer) ---");
  const res4 = await executor({
    customer_id: "C-9999",
    reason: "Policy gap",
  });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n--- Test 5: Validation Error (BADINPUT format) ---");
  const res5 = await executor({
    customer_id: "BADINPUT",
    reason: "Policy gap",
  });
  console.log("Result:", JSON.stringify(res5, null, 2));

  console.log("\n--- Test 6: Transient Error (C-0000 trigger) ---");
  const res6 = await executor({
    customer_id: "C-0000",
    reason: "Policy gap",
  });
  console.log("Result:", JSON.stringify(res6, null, 2));

  console.log("\n==========================================");
  console.log("   ESCALATE_TO_HUMAN MCP TOOL TEST DONE   ");
  console.log("==========================================");
}

runTests().catch(console.error);
