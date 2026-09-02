// PREDICT: { customer_id: "C-1001", name: "Ayesha Khan", email: "ayesha.khan@example.com", account_type: "premium" }
import { definition, executor } from "../get_customer.js";

async function runTests() {
  console.log("==========================================");
  console.log("      GET_CUSTOMER MCP TOOL TEST          ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful customer lookup (C-1001) ---");
  const res1 = await executor({ customer_id: "C-1001" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Business Error (C-9999) ---");
  const res2 = await executor({ customer_id: "C-9999" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Validation Error (INVALID) ---");
  const res3 = await executor({ customer_id: "INVALID" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Transient Error (C-0000) ---");
  const res4 = await executor({ customer_id: "C-0000" });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n==========================================");
  console.log("     GET_CUSTOMER MCP TOOL TEST COMPLETE  ");
  console.log("==========================================");
}

runTests().catch(console.error);
