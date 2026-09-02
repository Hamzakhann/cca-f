import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { runBillingAgent } from "./billingAgent.js";
import { runReturnsAgent } from "./returnsAgent.js";
import { runTechnicalSupportAgent } from "./technicalSupportAgent.js";
import { CaseFactsExtractor } from "../context/caseFactsExtractor.js";
import { Scratchpad } from "../context/scratchpad.js";
import { evaluateEscalation } from "../escalation/escalationEngine.js";
import { ProvenanceTracker } from "../provenance/provenanceTracker.js";
import { HumanReviewQueue } from "../review/humanQueue.js";

dotenv.config();

const client = new Anthropic();

/**
 * Helper to safely extract JSON from Claude's text response.
 */
function parseJSONResponse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse JSON response: ${text}`);
  }
}

/**
 * Helper to format escalation handoff payload into customer/agent facing markdown response.
 */
function formatEscalationResponse(handoff) {
  return `# ESCALATED TO HUMAN AGENT

**Priority:** ${(handoff.priority || "medium").toUpperCase()}
**Trigger:** ${handoff.trigger}
**Customer ID:** ${handoff.customer_id || "Unknown"}
**Attempts:** ${handoff.resolution_attempts}

**Recommended Action:**
${handoff.recommended_action}

**Billing Summary:** ${
    handoff.billing_summary
      ? `Invoice ${handoff.billing_summary.invoice_id} — Duplicate PKR ${handoff.billing_summary.duplicate_amount_pkr?.toLocaleString()}`
      : "N/A"
  }
**Returns Summary:** ${
    handoff.returns_summary
      ? `Order ${handoff.returns_summary.order_id} — Eligible: ${handoff.returns_summary.eligible}`
      : "N/A"
  }

*Handoff timestamp: ${handoff.handoff_timestamp}*`;
}

/**
 * Customer Support Coordinator orchestrates triage, subagent dispatch, escalation checks, and response synthesis.
 *
 * @param {string} userMessage - The raw inquiry from the customer.
 * @param {string} [customerId="C-1001"] - The ID of the customer.
 * @returns {Promise<string>} Final synthesized customer-facing resolution text or escalation handoff.
 */
export async function runCoordinator(userMessage, customerId = "C-1001") {
  const effectiveCustomerId = customerId || "C-1001";

  // 1. Create a scratchpad for this session
  const scratchpad = new Scratchpad(effectiveCustomerId);

  // 2. Check for prior session
  const priorContext = scratchpad.exists()
    ? scratchpad.toResumptionContext()
    : null;

  // 3. Create case facts extractor and provenance tracker
  const caseFactsExtractor = new CaseFactsExtractor(effectiveCustomerId);
  const provenance = new ProvenanceTracker();

  console.log("\n[Coordinator] Triage step: Analyzing customer request...");

  // Step 1: Triage call to Claude
  const triageSystemPrompt = `You are a customer support coordinator. Read the customer's request and identify which specialist agents are needed: billing, returns, technical, or any combination. Respond ONLY with a JSON object:
  {
    "needs_billing": boolean,
    "needs_returns": boolean,
    "needs_technical": boolean,
    "billing_context": "string",
    "returns_context": "string",
    "technical_context": "string"
  }
  where:
  - billing_context contains ONLY billing-related information and explicitly asks to investigate billing only.
  - returns_context contains ONLY returns-related information and explicitly asks to evaluate return eligibility only.
  - technical_context contains ONLY technical, API, SDK, authentication, or outage information and explicitly asks to diagnose technical issues only.`;

  const triageResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: triageSystemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  console.log(
    "Tokens used this turn (triage):",
    triageResponse.usage.input_tokens,
    "input,",
    triageResponse.usage.output_tokens,
    "output"
  );

  const triageText = triageResponse.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const triage = parseJSONResponse(triageText);
  console.log(`[Coordinator] Triage result: needs_billing=${triage.needs_billing}, needs_returns=${triage.needs_returns}, needs_technical=${triage.needs_technical}`);

  const billingContext = triage.billing_context || (triage.customer_context ? `${triage.customer_context}\nTask: Investigate the billing dispute only.` : "");
  const returnsContext = triage.returns_context || (triage.customer_context ? `${triage.customer_context}\nTask: Determine return eligibility only.` : "");
  const technicalContext = triage.technical_context || (triage.customer_context ? `${triage.customer_context}\nTask: Diagnose technical issues only.` : "");

  if (triage.needs_billing) console.log(`[Coordinator] Billing Context: "${billingContext}"`);
  if (triage.needs_returns) console.log(`[Coordinator] Returns Context: "${returnsContext}"`);
  if (triage.needs_technical) console.log(`[Coordinator] Technical Context: "${technicalContext}"`);

  // Step 2 & 3: Dispatch subagents based on triage (Parallel execution via Promise.all)
  const tasks = [];
  const taskTypes = [];

  // Callback to extract facts & provenance claims from subagent tool execution results
  const onToolResult = (toolName, result) => {
    caseFactsExtractor.extractFromToolResult(toolName, result);

    const tcId = provenance.recordToolCall(toolName, {}, result);
    if (result && !result.isError) {
      if (toolName === "get_invoice" && result.amount) {
        provenance.addClaim(
          { claim_type: "invoice_amount", claim: `PKR ${result.amount.toLocaleString()}` },
          tcId
        );
      }
      if (toolName === "check_payment_history" && result.payments?.length >= 2) {
        provenance.addClaim(
          { claim_type: "duplicate_charge", claim: "duplicate payment detected" },
          tcId
        );
      }
      if (toolName === "check_return_eligibility" && result.eligible !== undefined) {
        provenance.addClaim(
          {
            claim_type: "return_eligibility",
            claim: result.eligible
              ? `eligible (${result.days_remaining} days remaining)`
              : "ineligible",
          },
          tcId
        );
      }
    }
  };

  if (triage.needs_billing) {
    tasks.push(
      runBillingAgent(billingContext, onToolResult).catch((err) => ({
        isError: true,
        agent: "billing",
        error: err.message || String(err),
      }))
    );
    taskTypes.push("billing");
  }
  if (triage.needs_returns) {
    tasks.push(
      runReturnsAgent(returnsContext, onToolResult).catch((err) => ({
        isError: true,
        agent: "returns",
        error: err.message || String(err),
      }))
    );
    taskTypes.push("returns");
  }
  if (triage.needs_technical) {
    tasks.push(
      runTechnicalSupportAgent(technicalContext, onToolResult).catch((err) => ({
        isError: true,
        agent: "technical",
        error: err.message || String(err),
      }))
    );
    taskTypes.push("technical");
  }

  let billingResult = null;
  let returnsResult = null;
  let technicalResult = null;

  if (tasks.length > 0) {
    console.log(`[Coordinator] Dispatching [${taskTypes.join(", ")}] agent(s) in PARALLEL via Promise.all...`);
    const results = await Promise.all(tasks);
    
    taskTypes.forEach((type, idx) => {
      if (type === "billing") {
        billingResult = results[idx];
        if (billingResult && !billingResult.isError) {
          scratchpad.setAgentOutput("billing", billingResult);
        }
      }
      if (type === "returns") {
        returnsResult = results[idx];
        if (returnsResult && !returnsResult.isError) {
          scratchpad.setAgentOutput("returns", returnsResult);
        }
      }
      if (type === "technical") {
        technicalResult = results[idx];
        if (technicalResult && !technicalResult.isError) {
          scratchpad.setAgentOutput("technical", technicalResult);
        }
      }
    });
  } else {
    console.log("[Coordinator] No specialist agents needed.");
  }

  // Step 3.5: Check structural escalation before synthesizing
  const escalationDecision = evaluateEscalation({
    customerMessage: userMessage,
    caseFacts: caseFactsExtractor.getFacts(),
    resolutionAttempts: caseFactsExtractor.facts.resolution_attempts,
    hasPolicyGap: false,
  });

  if (escalationDecision.shouldEscalate) {
    console.log("[Coordinator] ESCALATION TRIGGERED:", escalationDecision.trigger);
    scratchpad.addPendingIssue(`escalated: ${escalationDecision.trigger}`);
    return formatEscalationResponse(escalationDecision.handoff);
  }

  // Step 4: Call Claude to synthesize final resolution
  console.log("[Coordinator] Synthesizing final customer response...");
  const synthesisSystemPrompt = `You are a customer support coordinator for ClaudeCare. Combine the findings from our specialist agent(s) into a unified, friendly, helpful, and professional customer-facing response.`;

  function formatResult(res) {
    if (!res) return null;
    if (typeof res === "object" && res.isError) {
      return `[ERROR in ${res.agent} agent: ${res.error}]`;
    }
    return res;
  }

  const formattedBilling = formatResult(billingResult);
  const formattedReturns = formatResult(returnsResult);
  const formattedTechnical = formatResult(technicalResult);

  let specialistFindings = "";
  if (formattedBilling) {
    specialistFindings += `\n--- Billing Specialist Findings ---\n${formattedBilling}\n`;
  }
  if (formattedReturns) {
    specialistFindings += `\n--- Returns Specialist Findings ---\n${formattedReturns}\n`;
  }
  if (formattedTechnical) {
    specialistFindings += `\n--- Technical Support Specialist Findings ---\n${formattedTechnical}\n`;
  }
  if (!specialistFindings) {
    specialistFindings = "No specialist findings required.";
  }

  // Get provenance verified claims context
  const provenanceContext = provenance.toSynthesisContext();

  // Inject case facts block, provenance claims, and prior context before synthesis prompt
  const caseFactsBlock = caseFactsExtractor.toCaseFactsBlock();
  const synthesisUserPrompt = `
${caseFactsBlock}

${provenanceContext}

${priorContext ? `${priorContext}\n` : ""}
Original Customer Request: ${userMessage}

Specialist Agent Findings:
${specialistFindings}

Please synthesize a final customer-facing resolution response based on the above case facts, verified claims, and specialist findings. Do not contradict VERIFIED CLAIMS above.
`.trim();

  const synthesisResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: synthesisSystemPrompt,
    messages: [{ role: "user", content: synthesisUserPrompt }],
  });

  console.log(
    "Tokens used this turn (synthesis):",
    synthesisResponse.usage.input_tokens,
    "input,",
    synthesisResponse.usage.output_tokens,
    "output"
  );

  const finalSynthesis = synthesisResponse.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // 6. After synthesis — write resolved issues to scratchpad
  if (triage.needs_billing) scratchpad.addResolvedIssue("billing duplicate");
  if (triage.needs_returns) scratchpad.addResolvedIssue("return request");
  if (triage.needs_technical) scratchpad.addResolvedIssue("technical diagnosis");

  return finalSynthesis;
}

