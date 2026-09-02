const OVERALL_THRESHOLD = 0.75;
const CRITICAL_FIELD_THRESHOLD = 0.80;
const CRITICAL_FIELDS = ["action_required", "issue_type"];

/**
 * HumanReviewQueue routes extracted issue objects to either automated processing
 * or a human review queue based on confidence thresholds and domain integrity rules.
 */
export class HumanReviewQueue {
  constructor() {
    this.queue = [];
    this.processedCount = 0;
    this.reviewedCount = 0;
  }

  /**
   * Routes an extracted issue to automated processing or human review queue.
   *
   * @param {Object} extraction - Extracted issue object with confidence scores.
   * @returns {Object} Routing decision object (route, reason, priority, queue_position).
   */
  route(extraction) {
    const reasons = [];
    const fieldsToVerify = [];

    // Check 1: Overall confidence
    if (extraction.confidence < OVERALL_THRESHOLD) {
      reasons.push(
        `Overall confidence (${extraction.confidence}) below threshold (${OVERALL_THRESHOLD})`
      );
    }

    // Check 2: Critical field confidence
    for (const field of CRITICAL_FIELDS) {
      const fieldConf = extraction[`${field}_confidence`];
      if (fieldConf !== undefined && fieldConf < CRITICAL_FIELD_THRESHOLD) {
        reasons.push(
          `${field} confidence (${fieldConf}) below critical threshold (${CRITICAL_FIELD_THRESHOLD})`
        );
        fieldsToVerify.push(field);
      }
    }

    // Check 3: Conflicting signals
    if (
      extraction.escalation_requested === true &&
      extraction.action_required !== "escalate"
    ) {
      reasons.push(
        `escalation_requested: true but action_required is '${extraction.action_required}' not 'escalate'`
      );
      fieldsToVerify.push("action_required", "escalation_requested");
    }

    // Check 4: Missing critical data
    if (!extraction.customer_id && extraction.action_required === "refund") {
      reasons.push(
        "action_required is refund but customer_id is null — cannot process without customer identification"
      );
      fieldsToVerify.push("customer_id");
    }

    if (reasons.length === 0) {
      this.processedCount++;
      return {
        route: "automated",
        reason: "all confidence scores above threshold",
        extraction_id: extraction.extraction_id,
      };
    }

    // Determine priority
    const hasHighConf =
      extraction.confidence < 0.6 || fieldsToVerify.includes("action_required");
    const priority = hasHighConf ? "high" : "medium";

    // Add to queue
    const queueItem = {
      extraction,
      reasons,
      fields_to_verify: [...new Set(fieldsToVerify)],
      priority,
      queued_at: new Date().toISOString(),
    };
    this.queue.push(queueItem);
    this.reviewedCount++;

    return {
      route: "human_review",
      reason: reasons[0],
      all_reasons: reasons,
      fields_to_verify: [...new Set(fieldsToVerify)],
      priority,
      queue_position: this.queue.length,
    };
  }

  /**
   * Returns current statistics for the review queue.
   *
   * @returns {Object} Metrics summarizing total processed, automated count, human review count, review rate, queue depth, and high priority count.
   */
  getQueueStats() {
    const total = this.processedCount + this.reviewedCount;
    return {
      total_processed: total,
      automated: this.processedCount,
      human_review: this.reviewedCount,
      review_rate: total > 0 ? this.reviewedCount / total : 0,
      queue_depth: this.queue.length,
      high_priority: this.queue.filter((i) => i.priority === "high").length,
    };
  }
}
