// PREDICT: { order_id: "ORD-5001", eligible: true, days_remaining: 18, refund_amount: 15000, currency: "PKR" }
import { definition, executor } from "../check_return_eligibility.js";

async function runTests() {
  console.log("==========================================");
  console.log(" CHECK_RETURN_ELIGIBILITY MCP TOOL TEST   ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Eligible order (ORD-5001, 12 days) ---");
  const res1 = await executor({ order_id: "ORD-5001", days_since_purchase: 12 });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Eligible order boundary (ORD-5002, 30 days) ---");
  const res2 = await executor({ order_id: "ORD-5002", days_since_purchase: 30 });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Ineligible order (ORD-5003, 35 days) ---");
  const res3 = await executor({ order_id: "ORD-5003", days_since_purchase: 35 });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Business Error (ORD-9999) ---");
  const res4 = await executor({ order_id: "ORD-9999", days_since_purchase: 10 });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n--- Test 5: Validation Error (BADINPUT order_id) ---");
  const res5 = await executor({ order_id: "BADINPUT", days_since_purchase: 10 });
  console.log("Result:", JSON.stringify(res5, null, 2));

  console.log("\n--- Test 6: Validation Error (Invalid days_since_purchase) ---");
  const res6 = await executor({ order_id: "ORD-5001", days_since_purchase: -5 });
  console.log("Result:", JSON.stringify(res6, null, 2));

  console.log("\n--- Test 7: Transient Error (ORD-0000) ---");
  const res7 = await executor({ order_id: "ORD-0000", days_since_purchase: 5 });
  console.log("Result:", JSON.stringify(res7, null, 2));

  console.log("\n==========================================");
  console.log("CHECK_RETURN_ELIGIBILITY TEST COMPLETE   ");
  console.log("==========================================");
}

runTests().catch(console.error);
