// PREDICT: { endpoint: "auth-v1", status: "operational", latency_ms: 45, uptime_percent: 99.9, last_checked: "2026-08-19T14:00:00Z" }
import { definition, executor } from "../check_api_status.js";

async function runTests() {
  console.log("==========================================");
  console.log("    CHECK_API_STATUS MCP TOOL TEST       ");
  console.log("==========================================");

  console.log("\n--- Definition Check ---");
  console.log("Name:", definition.name);
  console.log("Description:\n" + definition.description);

  console.log("\n--- Test 1: Successful status check (auth-v1) ---");
  const res1 = await executor({ endpoint: "auth-v1" });
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Business Error (unknown-api) ---");
  const res2 = await executor({ endpoint: "unknown-api" });
  console.log("Result:", JSON.stringify(res2, null, 2));

  console.log("\n--- Test 3: Validation Error (Empty endpoint) ---");
  const res3 = await executor({ endpoint: "" });
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n--- Test 4: Transient Error (END-0000) ---");
  const res4 = await executor({ endpoint: "END-0000" });
  console.log("Result:", JSON.stringify(res4, null, 2));

  console.log("\n==========================================");
  console.log("   CHECK_API_STATUS TOOL TEST COMPLETE    ");
  console.log("==========================================");
}

runTests().catch(console.error);
