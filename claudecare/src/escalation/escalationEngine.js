/**
 * Evaluates whether a support interaction requires escalation to a human agent based on
 * structural criteria (explicit request, policy gaps, or attempt thresholds).
 *
 * @param {Object} params
 * @param {string} params.customerMessage - Raw customer message string.
 * @param {Object} params.caseFacts - Extracted case facts object or CaseFactsExtractor instance.
 * @param {number} params.resolutionAttempts - Number of resolution attempts so far.
 * @param {boolean} params.hasPolicyGap - True if request falls outside automated policy.
 * @param {number} [params.maxAttempts=3] - Max allowed attempts before escalating.
 * @returns {Object} Escalation evaluation result with trigger and handoff summary.
 */
export function evaluateEscalation({
  customerMessage,
  caseFacts = {},
  resolutionAttempts = 0,
  hasPolicyGap = false,
  maxAttempts = 3,
}) {
  const rawFacts = caseFacts.facts || caseFacts;

  // ── Trigger 1: Customer explicitly demands human ──
  const humanDemandPhrases = [
    "speak to a manager",
    "talk to a human",
    "want a person",
    "speak to a person",
    "real agent",
    "human agent",
    "connect me to",
    "transfer me",
    "escalate this",
    "supervisor",
    "senior agent",
  ];
  const messageLower = (customerMessage || "").toLowerCase();
  const demandsHuman = humanDemandPhrases.some((phrase) =>
    messageLower.includes(phrase)
  );

  if (demandsHuman) {
    return {
      shouldEscalate: true,
      trigger: "customer_demand",
      handoff: buildHandoff(
        rawFacts,
        "customer_demand",
        "Customer explicitly requested a human agent",
        resolutionAttempts
      ),
    };
  }

  // ── Trigger 2: Policy gap ──
  if (hasPolicyGap) {
    return {
      shouldEscalate: true,
      trigger: "policy_gap",
      handoff: buildHandoff(
        rawFacts,
        "policy_gap",
        "Customer request falls outside automated policy coverage",
        resolutionAttempts
      ),
    };
  }

  // ── Trigger 3: Unable to make progress ──
  if (resolutionAttempts >= maxAttempts) {
    return {
      shouldEscalate: true,
      trigger: "max_attempts",
      handoff: buildHandoff(
        rawFacts,
        "max_attempts",
        `${resolutionAttempts} resolution attempts failed`,
        resolutionAttempts
      ),
    };
  }

  // ── No trigger — do not escalate ──
  return {
    shouldEscalate: false,
    trigger: null,
    reason:
      "No structural escalation criteria met. Issue is within automated resolution scope.",
  };
}

/**
 * Builds a structured handoff payload for human agent escalation.
 *
 * @param {Object} caseFacts - Extracted case facts.
 * @param {string} trigger - Trigger type identifier.
 * @param {string} triggerDescription - Human-readable description of trigger.
 * @param {number} attempts - Number of resolution attempts.
 * @returns {Object} Handoff payload.
 */
function buildHandoff(caseFacts, trigger, triggerDescription, attempts) {
  const priority =
    trigger === "customer_demand"
      ? "high"
      : trigger === "max_attempts"
      ? "high"
      : "medium";

  return {
    customer_id: caseFacts.customer_id,
    trigger: triggerDescription,
    resolution_attempts: attempts,
    billing_summary: caseFacts.billing
      ? {
          invoice_id: caseFacts.billing.invoice_id,
          duplicate_amount_pkr: caseFacts.billing.duplicate_amount_pkr,
          duplicate_payment_id: caseFacts.billing.duplicate_payment_id,
        }
      : null,
    returns_summary: caseFacts.returns
      ? {
          order_id: caseFacts.returns.order_id,
          eligible: caseFacts.returns.eligible,
          refund_amount_pkr: caseFacts.returns.refund_amount_pkr,
        }
      : null,
    customer_expectations: caseFacts.customer_expectations || [],
    recommended_action:
      trigger === "customer_demand"
        ? "Acknowledge customer's request, introduce yourself, continue resolution"
        : trigger === "policy_gap"
        ? "Review policy applicability and make exception determination"
        : "Review prior resolution attempts and identify next step",
    priority,
    handoff_timestamp: new Date().toISOString(),
  };
}
