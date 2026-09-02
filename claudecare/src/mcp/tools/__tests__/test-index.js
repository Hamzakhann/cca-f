import { toolDefinitions, toolExecutors } from "../index.js";

async function runTests() {
  console.log("==========================================");
  console.log("     MCP TOOLS BARREL INDEX TEST          ");
  console.log("==========================================");

  console.log("\n--- Tool Definitions Array ---");
  console.log("Count:", toolDefinitions.length);
  console.log("Names:", toolDefinitions.map((t) => t.name));

  console.log("\n--- Tool Executors Map ---");
  console.log("Keys:", Object.keys(toolExecutors));

  console.log("\n--- Executing test via toolExecutors.get_customer ---");
  const res = await toolExecutors.get_customer({ customer_id: "C-1001" });
  console.log("Result:", JSON.stringify(res, null, 2));

  console.log("\n==========================================");
  console.log("   MCP TOOLS BARREL INDEX TEST DONE       ");
  console.log("==========================================");
}

runTests().catch(console.error);
