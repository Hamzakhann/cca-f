import { runPreToolCall, runPostToolUse } from "./index.js";

function testHooksIndex() {
  console.log("==========================================");
  console.log("      HOOKS ENTRYPOINT INDEX TEST         ");
  console.log("==========================================");

  // Test Pre-Tool Call
  console.log("\n--- Testing runPreToolCall ---");
  const preRes = runPreToolCall("process_refund", { customer_id: "C-1001", amount: 60000 });
  console.log("Pre-tool call result:", preRes);

  // Test Post-Tool Use
  console.log("\n--- Testing runPostToolUse ---");
  const rawInvoice = JSON.stringify({ invoice_id: "INV-1001", date: 1754006400, status: 2, amount: 12500 });
  const postRes = runPostToolUse("get_invoice", rawInvoice);
  console.log("Post-tool use result:", postRes);

  console.log("\n==========================================");
  console.log("       HOOKS INDEX TEST COMPLETED         ");
  console.log("==========================================");
}

testHooksIndex();
