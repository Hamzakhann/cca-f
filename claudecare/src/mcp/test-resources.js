import { resources, getResource } from "./resources.js";

async function runTests() {
  console.log("==========================================");
  console.log("      MCP RESOURCES REGISTRY TEST         ");
  console.log("==========================================");

  console.log("\n--- Available Resources ---");
  console.log("Count:", Object.keys(resources).length);
  console.log("URIs:", Object.keys(resources));

  console.log("\n--- Test 1: Valid Resource (claudecare://policies/refund-limits) ---");
  const res1 = getResource("claudecare://policies/refund-limits");
  console.log("Result:", JSON.stringify(res1, null, 2));

  console.log("\n--- Test 2: Valid Resource (claudecare://policies/return-window) ---");
  const res2 = getResource("claudecare://policies/return-window");
  console.log("Name:", res2.name);

  console.log("\n--- Test 3: Unknown Resource (claudecare://policies/invalid) ---");
  const res3 = getResource("claudecare://policies/invalid");
  console.log("Result:", JSON.stringify(res3, null, 2));

  console.log("\n==========================================");
  console.log("    MCP RESOURCES REGISTRY TEST COMPLETE   ");
  console.log("==========================================");
}

runTests().catch(console.error);
