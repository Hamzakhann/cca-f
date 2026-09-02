import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const client = new Anthropic();

const AGENT_FILES = [
  "src/agents/coordinator.js",
  "src/agents/billingAgent.js",
  "src/agents/returnsAgent.js",
  "src/agents/technicalSupportAgent.js",
];

const contents = AGENT_FILES.map(
  (f) => `=== FILE: ${f} ===\n` + fs.readFileSync(f, "utf8")
).join("\n\n");

const schema = JSON.parse(
  fs.readFileSync("schemas/review-schema.json", "utf8")
);

async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are a ClaudeCare code reviewer. Review all four agent files together in a SINGLE pass.
Check for both local issues within each file and cross-file integration problems.
Respond with a JSON object matching this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY JSON. No markdown code fences.`,
    messages: [
      {
        role: "user",
        content: `Review all four agent files together for issues:\n\n${contents}`,
      },
    ],
  });

  const text = response.content[0].text;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  fs.writeFileSync(
    "review-single-pass.json",
    JSON.stringify({ structured_output: parsed }, null, 2)
  );
  console.log("Single pass review saved to review-single-pass.json");
}

main().catch((err) => {
  console.error("Single pass review failed:", err);
});
