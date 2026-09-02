import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { toolDefinitions } from "../index.js";

dotenv.config();

const client = new Anthropic();

const testCases = [
  { query: "What's Ahmed's account status?", expected: "get_customer", rationale: "Account status = account-level info" },
  { query: "Can you check order ORD-5001?", expected: "lookup_order", rationale: "Explicit order ID reference" },
  { query: "Tell me about this customer's recent purchase", expected: "lookup_order", rationale: "'Purchase' maps to order, not account" },
  { query: "Process a PKR 12,500 refund for C-1001", expected: "process_refund", rationale: "Explicit action request" },
  { query: "This needs a human", expected: "escalate_to_human", rationale: "Explicit escalation trigger" },
  { query: "Check Ahmed Ali's details", expected: "get_customer", rationale: "'Details' without 'order' = account" },
];

async function testSelection(query, expectedTool) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: "You are ClaudeCare's support agent. Use the available tools to assist customers.",
    tools: toolDefinitions,
    messages: [{ role: "user", content: query }],
  });

  if (response.stop_reason !== "tool_use") {
    console.log(`[FAIL] Query: "${query}" | Expected: ${expectedTool} | Actual: NO_TOOL_CALL (stop_reason: ${response.stop_reason})`);
    return false;
  }

  const toolBlock = response.content.find((block) => block.type === "tool_use");
  const actualTool = toolBlock ? toolBlock.name : "UNKNOWN";

  if (actualTool === expectedTool) {
    console.log(`[PASS] Query: "${query}" | Selected: ${actualTool}`);
    return true;
  } else {
    console.log(`[FAIL] Query: "${query}" | Expected: ${expectedTool} | Actual: ${actualTool}`);
    return false;
  }
}

async function runSelectionTests() {
  console.log("==========================================");
  console.log("    TOOL SELECTION RELIABILITY TEST       ");
  console.log("==========================================");

  let passed = 0;
  for (const { query, expected } of testCases) {
    const isSuccess = await testSelection(query, expected);
    if (isSuccess) passed++;
  }

  console.log("\n------------------------------------------");
  console.log(`SUMMARY: ${passed}/${testCases.length} correct selections`);
  console.log("------------------------------------------");

  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runSelectionTests().catch((err) => {
  console.error("Selection Test Error:", err);
  process.exit(1);
});
