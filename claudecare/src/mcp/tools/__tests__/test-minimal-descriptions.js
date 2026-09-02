import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { toolDefinitions } from "../index.js";

dotenv.config();

const client = new Anthropic();

// Minimal 1-sentence descriptions with input schemas preserved
const minimalDefinitions = [
  {
    name: "get_customer",
    description: "Gets customer information",
    input_schema: toolDefinitions.find((t) => t.name === "get_customer").input_schema,
  },
  {
    name: "lookup_order",
    description: "Looks up order information",
    input_schema: toolDefinitions.find((t) => t.name === "lookup_order").input_schema,
  },
  {
    name: "process_refund",
    description: "Processes a refund",
    input_schema: toolDefinitions.find((t) => t.name === "process_refund").input_schema,
  },
  {
    name: "escalate_to_human",
    description: "Escalates to human",
    input_schema: toolDefinitions.find((t) => t.name === "escalate_to_human").input_schema,
  },
];

const testCases = [
  { query: "What's Ahmed's account status?", expected: "get_customer" },
  { query: "Can you check order ORD-5001?", expected: "lookup_order" },
  { query: "Tell me about this customer's recent purchase", expected: "lookup_order" },
  { query: "Process a PKR 12,500 refund for C-1001", expected: "process_refund" },
  { query: "This needs a human", expected: "escalate_to_human" },
  { query: "Check Ahmed Ali's details", expected: "get_customer" },
];

async function testQuery(query, tools) {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You are ClaudeCare's support agent. Use the available tools to assist customers.",
      tools,
      messages: [{ role: "user", content: query }],
    });

    if (response.stop_reason !== "tool_use") {
      return "NO_TOOL_CALL";
    }

    const toolBlock = response.content.find((block) => block.type === "tool_use");
    return toolBlock ? toolBlock.name : "UNKNOWN";
  } catch (err) {
    return "ERROR";
  }
}

async function runContrastTest() {
  console.log("==========================================================================================");
  console.log("      MINIMAL DESCRIPTIONS VS RICH DESCRIPTIONS SELECTION CONTRAST TEST                   ");
  console.log("==========================================================================================");

  const results = [];
  let richScore = 0;
  let minimalScore = 0;

  for (const { query, expected } of testCases) {
    const richSelected = await testQuery(query, toolDefinitions);
    const minimalSelected = await testQuery(query, minimalDefinitions);

    const richPass = richSelected === expected;
    const minimalPass = minimalSelected === expected;

    if (richPass) richScore++;
    if (minimalPass) minimalScore++;

    results.push({
      query,
      expected,
      richSelected,
      richResult: richPass ? "PASS" : "FAIL",
      minimalSelected,
      minimalResult: minimalPass ? "PASS" : "FAIL",
    });
  }

  console.log("\n------------------------------------------------------------------------------------------");
  console.log("| Query                                      | Expected           | Rich Result        | Minimal Result     |");
  console.log("------------------------------------------------------------------------------------------");
  for (const r of results) {
    const qStr = r.query.padEnd(42).slice(0, 42);
    const expStr = r.expected.padEnd(18).slice(0, 18);
    const richStr = `${r.richSelected} (${r.richResult})`.padEnd(18).slice(0, 18);
    const minStr = `${r.minimalSelected} (${r.minimalResult})`.padEnd(18).slice(0, 18);
    console.log(`| ${qStr} | ${expStr} | ${richStr} | ${minStr} |`);
  }
  console.log("------------------------------------------------------------------------------------------");

  console.log(`\nFINAL SCORE COMPARISON:`);
  console.log(`- Rich Descriptions (5 Components):    ${richScore}/${testCases.length} (${Math.round((richScore / testCases.length) * 100)}%)`);
  console.log(`- Minimal Descriptions (1 Sentence):  ${minimalScore}/${testCases.length} (${Math.round((minimalScore / testCases.length) * 100)}%)`);
  console.log("==========================================================================================");
}

runContrastTest().catch((err) => {
  console.error("Contrast Test Error:", err);
  process.exit(1);
});
