/**
 * CaseFactsExtractor maintains a persistent, structured facts block across multi-turn
 * agent sessions to prevent loss of critical numerical, date, and ID facts due to summarization.
 */
export class CaseFactsExtractor {
  constructor(customerId) {
    this.customerId = customerId;
    this.facts = {
      customer_id: customerId,
      session_start: new Date().toISOString(),
      billing: null,
      returns: null,
      technical: null,
      customer_expectations: [],
      resolution_attempts: 0,
    };
  }

  /**
   * Updates case facts based on tool execution results.
   *
   * @param {string} toolName - Name of the executed tool.
   * @param {Object} result - Result object returned by the tool.
   */
  extractFromToolResult(toolName, result) {
    if (!result || result.isError) return; // don't extract from errors

    switch (toolName) {
      case "get_invoice":
        this.facts.billing = {
          ...this.facts.billing,
          invoice_id: result.invoice_id,
          invoice_amount_pkr: result.amount,
          payment_count: result.payment_count,
          invoice_status: result.status,
        };
        break;

      case "check_payment_history":
        if (result.payments?.length >= 2) {
          // Identify duplicate: same amount, consecutive days
          const sorted = [...result.payments].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          const duplicate = sorted[sorted.length - 1];
          this.facts.billing = {
            ...this.facts.billing,
            duplicate_payment_id: duplicate.payment_id,
            duplicate_date: duplicate.date,
            duplicate_amount_pkr: duplicate.amount,
            original_payment_id: sorted[0].payment_id,
          };
        }
        break;

      case "lookup_order":
        this.facts.returns = {
          order_id: result.order_id,
          item: result.item,
          purchase_date: result.purchase_date,
          order_amount_pkr: result.amount,
          payment_status: result.payment_status,
        };
        break;

      case "check_return_eligibility":
        this.facts.returns = {
          ...this.facts.returns,
          eligible: result.eligible,
          days_remaining: result.days_remaining,
          refund_amount_pkr: result.refund_amount,
          eligibility_reason: result.reason,
        };
        break;
    }
  }

  /**
   * Appends a stated customer expectation to the case facts.
   *
   * @param {string} expectation - The customer's stated expectation.
   */
  addCustomerExpectation(expectation) {
    this.facts.customer_expectations.push({
      stated: expectation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Increments the resolution attempts counter.
   *
   * @returns {number} The updated attempt count.
   */
  incrementAttempts() {
    this.facts.resolution_attempts++;
    return this.facts.resolution_attempts;
  }

  /**
   * Formats case facts into a concise Markdown string for prompt injection.
   *
   * @returns {string} Formatted case facts block.
   */
  toCaseFactsBlock() {
    const billingBlock = this.facts.billing
      ? `### Billing
Invoice: ${this.facts.billing.invoice_id}
Invoice amount: PKR ${this.facts.billing.invoice_amount_pkr?.toLocaleString()}
Duplicate payment: ${this.facts.billing.duplicate_payment_id} (${this.facts.billing.duplicate_date}) — PKR ${this.facts.billing.duplicate_amount_pkr?.toLocaleString()}`
      : "";

    const returnsBlock = this.facts.returns
      ? `### Returns
Order: ${this.facts.returns.order_id} — ${this.facts.returns.item}
Purchase date: ${this.facts.returns.purchase_date}
Eligible: ${this.facts.returns.eligible} (${this.facts.returns.days_remaining} days remaining)
Refund amount: PKR ${this.facts.returns.refund_amount_pkr?.toLocaleString()}`
      : "";

    const expectationsBlock =
      this.facts.customer_expectations.length > 0
        ? `### Customer Expectations
${this.facts.customer_expectations.map((e) => `- "${e.stated}"`).join("\n")}`
        : "";

    const sections = [
      `## CASE FACTS (DO NOT SUMMARISE — PRESERVE EXACTLY)`,
      `Customer: ${this.facts.customer_id}`,
      `Session: ${this.facts.session_start}`,
      `Resolution attempts: ${this.facts.resolution_attempts}`,
      billingBlock,
      returnsBlock,
      expectationsBlock,
    ]
      .filter((section) => section.length > 0)
      .join("\n\n");

    return sections;
  }

  /**
   * Returns raw case facts object.
   *
   * @returns {Object} Raw facts object.
   */
  getFacts() {
    return this.facts;
  }
}
