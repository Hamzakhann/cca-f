// PREDICT: { invoice_id: "INV-1001", amount: 12500, currency: "PKR", status: "paid", payment_count: 2, issue_date: "2026-08-01" }
import { definition, executor } from "../get_invoice.js";

async function runTests() {
  console.log("==========================================");
  console.log("       GET_INVOICE MCP TOOL TEST          ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful invoice lookup (INV-1001) ---");
  const res1 = await executor({ invoice_id: "INV-1001" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Successful invoice lookup (INV-2002) ---");
  const res2 = await executor({ invoice_id: "INV-2002" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Successful invoice lookup (INV-3003) ---");
  const res3 = await executor({ invoice_id: "INV-3003" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Business Error (INV-9999) ---");
  const res4 = await executor({ invoice_id: "INV-9999" });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n--- Test 5: Validation Error (BADINPUT) ---");
  const res5 = await executor({ invoice_id: "BADINPUT" });
  console.log("Result:", JSON.stringify(res5, null, 2));

  console.log("\n--- Test 6: Transient Error (INV-0000) ---");
  const res6 = await executor({ invoice_id: "INV-0000" });
  console.log("Result:", JSON.stringify(res6, null, 2));

  console.log("\n==========================================");
  console.log("     GET_INVOICE MCP TOOL TEST COMPLETE   ");
  console.log("==========================================");
}

runTests().catch(console.error);
