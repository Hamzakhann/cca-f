// PREDICT: { customer_id: "C-1001", currency: "PKR", payments: [{ payment_id: "PAY-8001", invoice_id: "INV-1001", amount: 12500 }] }
import { definition, executor } from "../check_payment_history.js";

async function runTests() {
  console.log("==========================================");
  console.log("  CHECK_PAYMENT_HISTORY MCP TOOL TEST    ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful lookup (C-1001) ---");
  const res1 = await executor({ customer_id: "C-1001" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Successful lookup (C-1002) ---");
  const res2 = await executor({ customer_id: "C-1002" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Successful lookup (C-1003) ---");
  const res3 = await executor({ customer_id: "C-1003" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Business Error (C-9999) ---");
  const res4 = await executor({ customer_id: "C-9999" });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n--- Test 5: Validation Error (BADINPUT) ---");
  const res5 = await executor({ customer_id: "BADINPUT" });
  console.log("Result:", JSON.stringify(res5, null, 2));

  console.log("\n--- Test 6: Transient Error (C-0000) ---");
  const res6 = await executor({ customer_id: "C-0000" });
  console.log("Result:", JSON.stringify(res6, null, 2));

  console.log("\n==========================================");
  console.log("CHECK_PAYMENT_HISTORY TEST COMPLETE       ");
  console.log("==========================================");
}

runTests().catch(console.error);
