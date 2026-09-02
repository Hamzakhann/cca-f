// PREDICT: { order_id: "ORD-5001", customer_id: "C-1001", product_name: "Wireless Headphones", purchase_date: "2026-08-01", amount: 15000, currency: "PKR", status: "delivered" }
import { definition, executor } from "../lookup_order.js";

async function runTests() {
  console.log("==========================================");
  console.log("      LOOKUP_ORDER MCP TOOL TEST          ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful order lookup (ORD-5001) ---");
  const res1 = await executor({ order_id: "ORD-5001" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Business Error (ORD-9999) ---");
  const res2 = await executor({ order_id: "ORD-9999" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Validation Error (INVALID) ---");
  const res3 = await executor({ order_id: "INVALID" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Transient Error (ORD-0000) ---");
  const res4 = await executor({ order_id: "ORD-0000" });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n==========================================");
  console.log("     LOOKUP_ORDER MCP TOOL TEST COMPLETE  ");
  console.log("==========================================");
}

runTests().catch(console.error);
