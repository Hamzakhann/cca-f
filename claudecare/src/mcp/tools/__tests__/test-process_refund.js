// PREDICT: { success: true, refund_id: "REF-XXX", amount: 12500, currency: "PKR", estimated_days: 5 }
import { definition, executor } from "../process_refund.js";

async function runTests() {
  console.log("==========================================");
  console.log("     PROCESS_REFUND MCP TOOL TEST         ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful refund (PKR 12,500) ---");
  const res1 = await executor({ customer_id: "C-1001", amount: 12500, reason: "confirmed duplicate payment PAY-8002" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Over limit business error (PKR 75,000) ---");
  const res2 = await executor({ customer_id: "C-1001", amount: 75000, reason: "large refund" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Invalid Customer business error (C-9999) ---");
  const res3 = await executor({ customer_id: "C-9999", amount: 12500, reason: "valid reason" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Empty Reason validation error ---");
  const res4 = await executor({ customer_id: "C-1001", amount: 12500, reason: "   " });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n--- Test 5: Validation Error (BADINPUT format) ---");
  const res5 = await executor({ customer_id: "BADINPUT", amount: 12500, reason: "valid reason" });
  console.log("Result:", JSON.stringify(res5, null, 2));

  console.log("\n--- Test 6: Transient Error (C-0000 trigger) ---");
  const res6 = await executor({ customer_id: "C-0000", amount: 12500, reason: "valid reason" });
  console.log("Result:", JSON.stringify(res6, null, 2));

  console.log("\n==========================================");
  console.log("    PROCESS_REFUND MCP TOOL TEST COMPLETE ");
  console.log("==========================================");
}

runTests().catch(console.error);
