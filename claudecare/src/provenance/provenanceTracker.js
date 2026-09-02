/**
 * ProvenanceTracker tracks data claims back to their specific tool call origins,
 * detecting conflicting claims and providing formatted provenance contexts.
 */
export class ProvenanceTracker {
  constructor() {
    this.claims = [];
    this.toolCalls = [];
  }

  /**
   * Records a tool execution call.
   *
   * @param {string} toolName - Name of executed tool.
   * @param {Object} args - Arguments passed to tool.
   * @param {Object|string} result - Output returned by tool.
   * @param {string} [timestamp=null] - ISO timestamp string.
   * @returns {string} Assigned tool call ID.
   */
  recordToolCall(toolName, args, result, timestamp = null) {
    const entry = {
      id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tool: toolName,
      args,
      result,
      queried_at: timestamp || new Date().toISOString(),
    };
    this.toolCalls.push(entry);
    return entry.id;
  }

  /**
   * Links a statement/claim to a recorded tool call origin.
   *
   * @param {Object} claim - { claim: string, claim_type: string }.
   * @param {string} sourceToolCallId - ID of tool call.
   * @param {number|null} [confidence=null] - Optional confidence score (0 to 1).
   */
  addClaim(claim, sourceToolCallId, confidence = null) {
    const sourceCall = this.toolCalls.find((tc) => tc.id === sourceToolCallId);
    if (!sourceCall) {
      throw new Error(`Tool call ${sourceToolCallId} not found`);
    }

    // Check for conflicts with existing claims
    const conflicting = this.claims.filter(
      (c) => c.claim_type === claim.claim_type && c.claim !== claim.claim
    );

    this.claims.push({
      claim: claim.claim,
      claim_type: claim.claim_type,
      source_tool: sourceCall.tool,
      source_tool_call_id: sourceToolCallId,
      queried_at: sourceCall.queried_at,
      confidence,
      conflicting_claims: conflicting.map((c) => ({
        claim: c.claim,
        source_tool: c.source_tool,
        queried_at: c.queried_at,
      })),
      has_conflict: conflicting.length > 0,
    });
  }

  /**
   * Generates a summary report of all tracked claims, conflicts, and confidence levels.
   *
   * @returns {Object} Provenance report object.
   */
  getProvenanceReport() {
    const conflicted = this.claims.filter((c) => c.has_conflict);
    const wellSupported = this.claims.filter(
      (c) => !c.has_conflict && (c.confidence === null || c.confidence >= 0.85)
    );
    const lowConfidence = this.claims.filter(
      (c) => c.confidence !== null && c.confidence < 0.85
    );

    return {
      total_claims: this.claims.length,
      well_supported: wellSupported.length,
      conflicted: conflicted.length,
      low_confidence: lowConfidence.length,
      claims: this.claims,
      synthesis_context: this.toSynthesisContext(),
    };
  }

  /**
   * Formats verified claims into a compact Markdown context string for prompt injection.
   *
   * @returns {string} Formatted verified claims block.
   */
  toSynthesisContext() {
    const lines = ["## VERIFIED CLAIMS (DO NOT CONTRADICT)"];
    for (const claim of this.claims) {
      const status = claim.has_conflict
        ? "⚠️ CONFLICT"
        : claim.confidence !== null && claim.confidence < 0.85
        ? "🔍 LOW CONFIDENCE"
        : "✅ VERIFIED";
      lines.push(
        `${status} | ${claim.claim_type}: ${claim.claim} | Source: ${claim.source_tool} at ${claim.queried_at}`
      );
      if (claim.has_conflict) {
        for (const c of claim.conflicting_claims) {
          lines.push(
            `   CONFLICTS WITH: ${c.claim} | Source: ${c.source_tool} at ${c.queried_at}`
          );
        }
      }
    }
    return lines.join("\n");
  }
}
