import { extractIssue } from "./issueExtractor.js";

/**
 * Validates extracted issue data against domain business rules.
 *
 * @param {Object} extraction - The extracted issue object matching issueSchema.
 * @returns {Object} { valid: true } or { valid: false, errors: string[] }
 */
export function validateExtraction(extraction) {
  const errors = [];

  // Rule 1: invoice_id presence implies billing
  if (extraction.invoice_id && extraction.issue_type !== "billing") {
    errors.push("invoice_id present but issue_type is not 'billing'");
  }

  // Rule 2: return action requires order_id
  if (extraction.action_required === "return" && !extraction.order_id) {
    errors.push("action_required 'return' requires order_id");
  }

  // Rule 3: refund action requires amount_pkr
  if (extraction.action_required === "refund" && !extraction.amount_pkr) {
    errors.push("action_required 'refund' should include amount_pkr");
  }

  // Rule 4: escalation_requested true requires action escalate
  if (
    extraction.escalation_requested &&
    extraction.action_required !== "escalate"
  ) {
    errors.push("escalation_requested true but action_required is not 'escalate'");
  }

  // Rule 5: issue_type "other" requires issue_type_detail
  if (extraction.issue_type === "other" && !extraction.issue_type_detail) {
    errors.push("issue_type 'other' requires issue_type_detail description");
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

/**
 * Extracts issue details with an iterative retry loop feeding validation errors back to Claude.
 *
 * @param {string} message - The customer support message.
 * @param {number} maxRetries - Maximum number of extraction attempts (default 3).
 * @returns {Promise<Object>} The validated extraction object or exhausted failure state.
 */
export async function extractWithRetry(message, maxRetries = 3) {
  let attempt = 0;
  let lastExtraction = null;
  let lastErrors = [];

  while (attempt < maxRetries) {
    attempt++;
    console.log(`Extraction attempt ${attempt}/${maxRetries}`);

    // Build retry prompt with specific errors if this is a retry
    let prompt = message;
    if (lastErrors.length > 0) {
      prompt = `Original message: "${message}"

Previous extraction failed validation with these specific errors:
${lastErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Failed extraction was:
${JSON.stringify(lastExtraction, null, 2)}

Please re-extract correcting these specific issues.`;
    }

    lastExtraction = await extractIssue(prompt);
    const validation = validateExtraction(lastExtraction);

    if (validation.valid) {
      console.log(`Extraction succeeded on attempt ${attempt}`);
      return { ...lastExtraction, attempts: attempt };
    }

    lastErrors = validation.errors;
    console.log(`Attempt ${attempt} failed:`, lastErrors);
  }

  // All retries exhausted
  return {
    ...lastExtraction,
    attempts: attempt,
    valid: false,
    exhausted: true,
    needsHuman: true,
    finalErrors: lastErrors,
  };
}
