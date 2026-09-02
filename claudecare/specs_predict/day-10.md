### SPEC 
Submits a batch of support ticket messages to the Anthropic Message Batches API for overnight categorisation. Each ticket becomes one batch request with a custom_id matching the ticket ID. Uses the extract_support_issue tool schema from Day 9 — but as a prompt instruction, not as an actual tool call, because the Batches API cannot do tool calling. Returns the batch ID for polling. Writes submitted tickets to a local log file for recovery if needed.

### PREDICTED EXECUTION 
Input: 3 mock tickets
Output:
  Batch ID: batch_abc123
  Submitted: 3 requests
  custom_ids: ["ticket-001", "ticket-002", "ticket-003"]
  Log written: .claude/batch-log-2026-08-24.json



### SPEC

Polls a batch by ID until it completes or times out. Parses results by custom_id. Separates successes from failures. For failures, logs the custom_id and error so the caller can resubmit only those tickets. Returns structured results ready for downstream processing.

### PREDICTED EXECUTION 
5 mock tickets submitted as a batch.
After polling completes:
  succeeded: 5 (all parse to valid JSON)
  failed: 0
  Ticket ticket-003 (escalation demand):
    issue_type: "other", action_required: "escalate",
    escalation_requested: true
  Ticket ticket-005 (technical):
    issue_type: "technical", action_required: "investigate"
    
### SPEC
Implements a 2-pass review of ClaudeCare's agent layer. Pass 1: reviews each agent file independently for local issues (one Claude invocation per file, fresh session per file). Pass 2: reviews the full agent system for cross-file integration issues using only the Pass 1 summaries as input (one Claude invocation, no raw file content). Returns combined findings from both passes with pass number and scope labelled on each finding.



### PREDICTED EXECUTION 


Pass 1 — per-file local review:
  billingAgent.js: 0 local issues (after Day 9 fixes)
  returnsAgent.js: 0 local issues
  coordinator.js:  0 local issues
  technicalSupportAgent.js: 0 local issues (new, should be clean)

Pass 2 — cross-file integration review:
  Possible finding: verify coordinator passes 'needs_technical'
  correctly to route technical queries
  Possible finding: verify all 3 agents use filtered tool lists
  Expected: 0-2 findings, all integration-level