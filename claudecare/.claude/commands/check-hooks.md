# /check-hooks

Audits hook coverage across the ClaudeCare codebase.
Verifies every business rule has a hook, not just a prompt.

Steps:
1. Read src/hooks/normalizer.js — list all tools it transforms
2. Read src/hooks/refundGuard.js — list the threshold and redirect
3. Read src/agents/billingAgent.js — verify hooks are wired in
4. Check for business rules mentioned in system prompts that
   should be moved to hooks instead
5. Report: covered rules, uncovered rules, recommended additions
