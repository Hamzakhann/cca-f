/**
 * StratifiedSampler groups extractions into strata (e.g. by issue_type)
 * to perform balanced, representative sampling for quality auditing.
 */
export class StratifiedSampler {
  constructor(sampleSizePerStratum = 10) {
    this.sampleSizePerStratum = sampleSizePerStratum;
    this.strata = {}; // keyed by issue_type
    this.samples = [];
  }

  /**
   * Ingests an extracted issue object into its corresponding stratum.
   *
   * @param {Object} extraction - The extracted issue object.
   */
  ingest(extraction) {
    const stratum = extraction.issue_type || "unknown";
    if (!this.strata[stratum]) {
      this.strata[stratum] = [];
    }
    this.strata[stratum].push(extraction);
  }

  /**
   * Samples up to sampleSizePerStratum items randomly from each stratum.
   *
   * @returns {Array<Object>} Array of sampled extraction items annotated with `_stratum`.
   */
  getSample() {
    const sample = [];
    for (const [stratum, extractions] of Object.entries(this.strata)) {
      // Take up to sampleSizePerStratum from each stratum
      const shuffled = [...extractions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, this.sampleSizePerStratum);
      sample.push(...selected.map((e) => ({ ...e, _stratum: stratum })));
      console.log(
        `Stratum '${stratum}': ${extractions.length} total, ${selected.length} sampled`
      );
    }
    this.samples = sample;
    return sample;
  }

  /**
   * Returns total count of extractions per stratum.
   *
   * @returns {Object} Map of stratum name to total count.
   */
  getStratumCounts() {
    const counts = {};
    for (const [stratum, items] of Object.entries(this.strata)) {
      counts[stratum] = items.length;
    }
    return counts;
  }

  /**
   * Checks if each stratum has at least 5 samples for meaningful statistical evaluation.
   *
   * @returns {boolean} True if all strata have >= 5 items.
   */
  hasSufficientData() {
    const strataValues = Object.values(this.strata);
    if (strataValues.length === 0) return false;
    return strataValues.every((s) => s.length >= 5);
  }
}
