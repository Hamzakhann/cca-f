/**
 * PreToolUse guard function to validate and intercept automated refund tool calls.
 *
 * @param {string} toolName - Name of the tool being requested.
 * @param {Object} toolArgs - Arguments passed to the tool.
 * @returns {Object} Guard status { blocked: boolean, redirectTo?: string, message?: string }
 */
export function guardRefund(toolName, toolArgs) {
  if (toolName !== "process_refund") {
    return { blocked: false };
  }

  const amount = toolArgs?.amount || 0;
  const customerId = toolArgs?.customer_id || "unknown";

  if (amount > 50000) {
    console.log(`RefundGuard: PKR ${amount} — BLOCKED → escalate_to_human`);
    return {
      blocked: true,
      redirectTo: "escalate_to_human",
      message: `Automated refund blocked: PKR ${amount.toLocaleString()} exceeds the PKR 50,000 automated limit. Call escalate_to_human with: - customer_id: ${customerId} - refund_amount: ${amount} - reason: "Refund exceeds automated approval limit"`,
    };
  }

  console.log(`RefundGuard: PKR ${amount} — ALLOWED`);
  return { blocked: false };
}
