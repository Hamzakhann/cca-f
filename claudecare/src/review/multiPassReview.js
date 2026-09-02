import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const client = new Anthropic();

export const AGENT_FILES = [
  "src/agents/coordinator.js",
  "src/agents/billingAgent.js",
  "src/agents/returnsAgent.js",
  "src/agents/technicalSupportAgent.js",
];

/**
 * Runs a multi-pass code review across agent files:
 * Pass 1: Local per-file analysis without shared context.
 * Pass 2: Cross-file integration analysis using Pass 1 summaries and interface files.
 *
 * @returns {Promise<Object>} Combined findings from Pass 1 and Pass 2.
 */
function cleanJSONParse(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function runMultiPassReview() {
  // ═══ PASS 1: Per-file local analysis ═══
  console.log("=== Pass 1: Per-file local analysis ===");
  const pass1Results = [];

  for (const filePath of AGENT_FILES) {
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Fresh Claude invocation per file — no shared context
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a ClaudeCare code reviewer.
Review only the single file provided.
Check ONLY local issues within this file:
- Raw throws instead of structured error returns
- Inline tool definitions (should be zero)
- Missing hook wiring (billingAgent must have refundGuard)
- stop_reason correctly used as loop termination
- No hardcoded customer data
Return a JSON object:
{
  "file": "${filePath}",
  "local_issues": [
    { "line": number, "issue": "description", "severity": "high|medium|low" }
  ],
  "summary": "one sentence: what this file does and its local health"
}
Return ONLY JSON. No markdown.`,
      messages: [
        {
          role: "user",
          content: `Review this file:\n\n${fileContent}`,
        },
      ],
    });

    const result = cleanJSONParse(response.content[0].text);
    pass1Results.push(result);
    console.log(`Pass 1 | ${filePath}: ${result.local_issues.length} issues`);
  }

  // ═══ PASS 2: Cross-file integration analysis ═══
  console.log("\n=== Pass 2: Cross-file integration analysis ===");

  // Pass 2 receives ONLY the summaries from Pass 1
  // NOT the raw file content — prevents attention dilution
  const pass1Summaries = pass1Results
    .map((r) => `${r.file}: ${r.summary}`)
    .join("\n");

  // Also pass the interface contracts as reference
  const coordinatorContent = fs.readFileSync(
    "src/agents/coordinator.js",
    "utf8"
  );
  const registryContent = fs.readFileSync("src/mcp/tools/index.js", "utf8");

  const pass2Response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a ClaudeCare integration reviewer.
You are performing Pass 2 of a multi-pass review.
Pass 1 already checked each file for LOCAL issues.
Your job is CROSS-FILE integration issues ONLY.

Check for:
1. Coordinator routing: does it correctly identify
   billing, returns, AND technical queries?
2. Context injection: does coordinator pass the right
   fields to each agent's context string?
3. Tool scoping: does each agent use a filtered tool list
   (not all tools from the registry)?
4. Hook wiring: are hooks called in billingAgent but
   not in other agents that also call process_refund?
5. Interface contracts: do field names match between
   coordinator output and agent input expectations?

Return JSON:
{
  "integration_issues": [
    {
      "files_involved": ["file1.js", "file2.js"],
      "issue": "description of cross-file problem",
      "severity": "high|medium|low"
    }
  ],
  "integration_health": "one sentence overall assessment"
}
Return ONLY JSON. No markdown.`,
    messages: [
      {
        role: "user",
        content: `Pass 1 summaries:\n${pass1Summaries}\n\nCoordinator implementation (for interface verification):\n${coordinatorContent}\n\nTool registry (for scoping verification):\n${registryContent}\n\nIdentify any cross-file integration issues.`,
      },
    ],
  });

  const pass2Result = cleanJSONParse(pass2Response.content[0].text);
  console.log(
    `Pass 2: ${pass2Result.integration_issues.length} integration issues`
  );

  // ═══ COMBINE AND REPORT ═══
  return {
    pass1: pass1Results,
    pass2: pass2Result,
    combined_findings: [
      ...pass1Results.flatMap((r) =>
        r.local_issues.map((issue) => ({
          pass: 1,
          scope: "local",
          file: r.file,
          ...issue,
        }))
      ),
      ...pass2Result.integration_issues.map((issue) => ({
        pass: 2,
        scope: "integration",
        ...issue,
      })),
    ],
  };
}
