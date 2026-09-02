### SPEC 
Routes extractions to human review based on field-level confidence scores. An extraction routes to review if: (a) overall confidence is below 0.75, (b) any critical field (action_required, issue_type) has confidence below 0.80, or (c) the extraction has conflicting signals (escalation_requested true but action_required is not escalate). Returns a routing decision with the specific reason for review — not just a boolean.

### PREDICTED EXECUTION 

route({
  issue_type: "billing", issue_type_confidence: 0.95,
  action_required: "refund", action_required_confidence: 0.65,
  confidence: 0.82
})
→ {
    route: "human_review",
    reason: "action_required confidence (0.65) below critical field threshold (0.80)",
    priority: "medium",
    fields_to_verify: ["action_required"]
  }

route({
  issue_type: "billing", issue_type_confidence: 0.95,
  action_required: "refund", action_required_confidence: 0.92,
  confidence: 0.93,
  escalation_requested: true
})
→ {
    route: "human_review",
    reason: "escalation_requested: true but action_required is 'refund' not 'escalate'",
    priority: "high",
    fields_to_verify: ["action_required", "escalation_requested"]
  }

route({
  issue_type: "billing", issue_type_confidence: 0.97,
  action_required: "refund", action_required_confidence: 0.91,
  confidence: 0.94,
  escalation_requested: false
})
→ { route: "automated", reason: "all confidence scores above threshold" }

### SPEC 

Tracks extraction accuracy per issue_type and per field. Accepts labeled corrections (human reviewer says "action_required should have been 'escalate' not 'refund'"). Reports accuracy by category and field. Flags any category or field below the accuracy threshold. Never reports aggregate accuracy alone — always per-segment.



### SPEC 

Tracks the source of every claim made during a resolution session. Maps each coordinator assertion to the specific tool call that produced the underlying data, including the timestamp of that tool call. Detects conflicting sources for the same claim. Outputs a provenance report that the coordinator includes in the synthesis prompt — so the synthesis agent knows what is verified evidence and what is inferred.