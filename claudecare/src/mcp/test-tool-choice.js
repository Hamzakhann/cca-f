import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { toolDefinitions } from "./tools/index.js";

dotenv.config();

const client = new Anthropic();

async function runToolChoiceTests() {
  console.log("==========================================");
  console.log("       MCP TOOL_CHOICE STRATEGY TEST      ");
  console.log("==========================================");

  let passed = 0;

  // Scenario A: tool_choice = { type: "auto" } on trivial question
  console.log("\n--- Scenario A: tool_choice = { type: 'auto' } ---");
  console.log("Query: 'What is 2 + 2?'");
  try {
    const resA = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are a helpful assistant.",
      tools: toolDefinitions,
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: "What is 2 + 2?" }],
    });

    const isToolCallA = resA.stop_reason === "tool_use";
    const passA = resA.stop_reason === "end_turn" && !isToolCallA;
    console.log(`stop_reason: ${resA.stop_reason}`);
    console.log(`Tool call made: ${isToolCallA}`);
    if (passA) {
      console.log("[PASS] Scenario A: No tool call made as expected (stop_reason === 'end_turn')");
      passed++;
    } else {
      console.log(`[FAIL] Scenario A: Expected end_turn, received stop_reason = ${resA.stop_reason}`);
    }
  } catch (err) {
    console.log(`[FAIL] Scenario A error: ${err.message}`);
  }

  // Scenario B: tool_choice = { type: "any" } on trivial question
  console.log("\n--- Scenario B: tool_choice = { type: 'any' } ---");
  console.log("Query: 'What is 2 + 2?'");
  try {
    const resB = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are a helpful assistant.",
      tools: toolDefinitions,
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: "What is 2 + 2?" }],
    });

    const isToolCallB = resB.stop_reason === "tool_use";
    const toolBlockB = resB.content.find((b) => b.type === "tool_use");
    const calledToolB = toolBlockB ? toolBlockB.name : "NONE";
    const passB = isToolCallB && toolBlockB !== undefined;

    console.log(`stop_reason: ${resB.stop_reason}`);
    console.log(`Tool call made: ${isToolCallB} (Tool: ${calledToolB})`);
    if (passB) {
      console.log(`[PASS] Scenario B: Tool call forced as expected (called '${calledToolB}')`);
      passed++;
    } else {
      console.log(`[FAIL] Scenario B: Expected tool_use, received stop_reason = ${resB.stop_reason}`);
    }
  } catch (err) {
    console.log(`[FAIL] Scenario B error: ${err.message}`);
  }

  // Scenario C: tool_choice = { type: "tool", name: "get_customer" } on refund request
  console.log("\n--- Scenario C: tool_choice = { type: 'tool', name: 'get_customer' } ---");
  console.log("Query: 'Process a refund for customer C-1001'");
  try {
    const resC = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are a helpful customer support agent.",
      tools: toolDefinitions,
      tool_choice: { type: "tool", name: "get_customer" },
      messages: [{ role: "user", content: "Process a refund for customer C-1001" }],
    });

    const toolBlockC = resC.content.find((b) => b.type === "tool_use");
    const calledToolC = toolBlockC ? toolBlockC.name : "NONE";
    const passC = resC.stop_reason === "tool_use" && calledToolC === "get_customer";

    console.log(`stop_reason: ${resC.stop_reason}`);
    console.log(`Tool called: ${calledToolC}`);
    if (passC) {
      console.log("[PASS] Scenario C: get_customer was forced as first tool call");
      passed++;
    } else {
      console.log(`[FAIL] Scenario C: Expected get_customer, received '${calledToolC}'`);
    }
  } catch (err) {
    console.log(`[FAIL] Scenario C error: ${err.message}`);
  }

  console.log("\n==========================================");
  console.log(`SUMMARY: ${passed}/3 tool choice scenarios passed`);
  console.log("==========================================");

  if (passed !== 3) {
    process.exit(1);
  }
}

runToolChoiceTests().catch((err) => {
  console.error("Tool Choice Test Error:", err);
  process.exit(1);
});
