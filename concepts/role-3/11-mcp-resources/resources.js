// resources.js
// The policy catalog for ClaudeCare.
// These are stable documents — they don't change per request.
// An agent reads them to know business rules.

export const RESOURCES = {

    "claudecare://policies/refund-limits": {
        name: "Refund Limits Policy",
        description: "Automated refund thresholds and approval requirements",
        mimeType: "text/plain",
        content: `CLAUDECARE REFUND LIMITS POLICY
Last updated: 2026-08-01

AUTOMATED REFUND CEILING: PKR 50,000
  - Refunds at or below PKR 50,000: process automatically via process_refund
  - No additional approval required
  - Processing time: 5-7 business days

HUMAN APPROVAL REQUIRED: PKR 50,001 to PKR 100,000
  - Must use escalate_to_human
  - Assigned to Senior Billing Agent
  - Response SLA: 4 hours

SENIOR MANAGER SIGN-OFF: Above PKR 100,000
  - Must use escalate_to_human with priority: high
  - Assigned to Billing Manager tier
  - Response SLA: 1 business day

NEVER process a refund above PKR 50,000 through the automated channel.
The refundGuard hook enforces this as a hard block.`
    },

    "claudecare://policies/return-window": {
        name: "Return Window Policy",
        description: "Product return eligibility rules and timeframes",
        mimeType: "text/plain",
        content: `CLAUDECARE RETURN POLICY
Last updated: 2026-08-01

STANDARD RETURN WINDOW: 30 days from purchase date
  - Eligible: purchase date within 30 days of return request
  - Not eligible: purchase date more than 30 days ago
  - No exceptions through the automated channel after 30 days

REFUND AMOUNT: Full purchase price
  - No restocking fee
  - Original shipping is non-refundable
  - Refund to original payment method only

ITEM CONDITION REQUIRED:
  - Original packaging preferred but not required
  - Item must be in working condition
  - Custom or personalised items: not eligible for return

TO PROCESS A RETURN:
  1. Call lookup_order to get purchase date
  2. Call check_return_eligibility with days_since_purchase
  3. If eligible: call process_refund
  4. If not eligible: explain policy, offer escalate_to_human for exceptions`
    },

    "claudecare://policies/escalation-triggers": {
        name: "Escalation Trigger Criteria",
        description: "When to escalate to a human agent",
        mimeType: "text/plain",
        content: `CLAUDECARE ESCALATION POLICY
Last updated: 2026-08-01

MANDATORY ESCALATION TRIGGERS (use escalate_to_human immediately):

1. CUSTOMER DEMAND
   Customer explicitly uses phrases like:
   "speak to a manager", "want a human", "real person",
   "transfer me", "supervisor", "senior agent", "escalate this"
   → Escalate immediately. Do not attempt automated resolution first.

2. REFUND ABOVE LIMIT
   Any refund request above PKR 50,000
   → Escalate with refund_amount included in the escalation

3. POLICY GAP
   Customer's request is not covered by any existing policy rule
   → Escalate with clear description of why policy is silent

4. THREE FAILED ATTEMPTS
   Three consecutive resolution attempts have failed
   → Escalate with summary of what was attempted

NEVER ESCALATE BASED ON:
   - Customer anger or frustration (tone is not a trigger)
   - Loud or aggressive language (emotion is not complexity)
   - Your own confidence level (use structured criteria only)

WHEN IN DOUBT: attempt automated resolution first.
Escalation should be a last resort, not a first response.`
    },

    "claudecare://policies/customer-tiers": {
        name: "Customer Tier Definitions",
        description: "Support tier SLAs and eligibility rules",
        mimeType: "text/plain",
        content: `CLAUDECARE CUSTOMER TIER POLICY
Last updated: 2026-08-01

STANDARD TIER
  - Response SLA: 24 hours
  - Automated refund limit: PKR 50,000 (standard policy)
  - Return window: 30 days (standard policy)
  - Support channel: automated agent + email

PREMIUM TIER
  - Response SLA: 4 hours
  - Automated refund limit: PKR 50,000 (standard policy)
  - Return window: 30 days (standard policy)
  - Priority queue: yes
  - Support channel: automated agent + priority email

ENTERPRISE TIER
  - Response SLA: 1 hour
  - Automated refund limit: PKR 50,000 (standard policy)
    Note: enterprise contract terms may allow exceptions — escalate for review
  - Return window: negotiable per contract
  - Dedicated agent: yes
  - Support channel: dedicated agent + phone

DETERMINING TIER:
  Call get_customer and read the account_tier field.
  Use tier to set escalation priority and response expectations.`
    }
}

// Utility: get a resource by URI
export function getResource(uri) {
    const resource = RESOURCES[uri]
    if (!resource) {
        return {
            isError: true,
            errorCategory: "business",
            isRetryable: false,
            description: `Resource not found: ${uri}. Available resources: ${Object.keys(RESOURCES).join(", ")}`
        }
    }
    return resource
}

// Utility: list all resource URIs and descriptions
export function listResources() {
    return Object.entries(RESOURCES).map(([uri, r]) => ({
        uri,
        name: r.name,
        description: r.description
    }))
}