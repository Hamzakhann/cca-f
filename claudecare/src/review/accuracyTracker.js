/**
 * AccuracyTracker compares model extractions against human ground truth,
 * computing accuracy by issue segment and field name, and flagging any sub-threshold performance.
 */
export class AccuracyTracker {
  constructor() {
    this.records = []; // { issue_type, field_results, recorded_at }
    this.ACCURACY_THRESHOLD = 0.90;
  }

  /**
   * Records an extraction alongside human verified ground truth.
   *
   * @param {Object} extraction - The model's extracted output object.
   * @param {Object} groundTruth - The human verified ground truth object.
   */
  record(extraction, groundTruth) {
    const fieldResults = {};
    const trackedFields = [
      "issue_type",
      "severity",
      "action_required",
      "customer_id",
      "amount_pkr",
    ];

    for (const field of trackedFields) {
      fieldResults[field] = {
        extracted: extraction[field],
        ground_truth: groundTruth[field],
        correct: extraction[field] === groundTruth[field],
      };
    }

    this.records.push({
      issue_type: extraction.issue_type || "unknown",
      field_results: fieldResults,
      recorded_at: new Date().toISOString(),
    });
  }

  /**
   * Generates accuracy breakdown reports across issue types and fields.
   *
   * @returns {Object} Accuracy report with segment breakdowns, flags, and overall automation safety verdict.
   */
  getReport() {
    if (this.records.length === 0) {
      return { error: "No records yet" };
    }

    // Accuracy by issue_type
    const byType = {};
    for (const record of this.records) {
      if (!byType[record.issue_type]) {
        byType[record.issue_type] = { total: 0, correct: 0 };
      }
      byType[record.issue_type].total++;
      // A record is "correct" if all tracked fields are correct
      const allCorrect = Object.values(record.field_results).every(
        (f) => f.correct
      );
      if (allCorrect) byType[record.issue_type].correct++;
    }

    // Accuracy by field (across all types)
    const byField = {};
    for (const record of this.records) {
      for (const [field, result] of Object.entries(record.field_results)) {
        if (!byField[field]) {
          byField[field] = { total: 0, correct: 0 };
        }
        byField[field].total++;
        if (result.correct) byField[field].correct++;
      }
    }

    // Calculate rates and flag failures
    const typeAccuracy = {};
    const typeFlags = [];
    for (const [type, counts] of Object.entries(byType)) {
      const rate = counts.correct / counts.total;
      typeAccuracy[type] = rate;
      if (rate < this.ACCURACY_THRESHOLD) {
        typeFlags.push({
          segment: `issue_type: ${type}`,
          accuracy: rate,
          below_threshold: this.ACCURACY_THRESHOLD,
        });
      }
    }

    const fieldAccuracy = {};
    const fieldFlags = [];
    for (const [field, counts] of Object.entries(byField)) {
      const rate = counts.correct / counts.total;
      fieldAccuracy[field] = rate;
      if (rate < this.ACCURACY_THRESHOLD) {
        fieldFlags.push({
          segment: `field: ${field}`,
          accuracy: rate,
          below_threshold: this.ACCURACY_THRESHOLD,
        });
      }
    }

    const overallCorrect = this.records.filter((r) =>
      Object.values(r.field_results).every((f) => f.correct)
    ).length;
    const overallAccuracy = overallCorrect / this.records.length;

    return {
      WARNING:
        overallAccuracy >= this.ACCURACY_THRESHOLD
          ? null
          : "Overall accuracy BELOW threshold — check segments below",
      overall_accuracy: overallAccuracy,
      samples: this.records.length,
      by_issue_type: typeAccuracy,
      by_field: fieldAccuracy,
      flags: [...typeFlags, ...fieldFlags],
      automation_safe: typeFlags.length === 0 && fieldFlags.length === 0,
    };
  }
}
