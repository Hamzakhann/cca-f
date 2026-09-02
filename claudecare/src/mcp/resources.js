// ClaudeCare Policy Catalog — MCP Resources
export const resources = {
  "claudecare://policies/refund-limits": {
    name: "Refund Limits Policy",
    content: `ClaudeCare Automated Refund Limits:
      - Automated refund ceiling: PKR 50,000
      - Refunds above PKR 50,000: require human agent approval
        via escalate_to_human tool
      - Refunds above PKR 100,000: require Senior Billing Manager sign-off
      - Processing time: 5-7 business days for approved refunds`,
  },
  "claudecare://policies/return-window": {
    name: "Return Window Policy",
    content: `ClaudeCare Return Policy:
      - Standard return window: 30 days from purchase date
      - No exceptions through automated channel after 30 days
      - Items must be in original condition
      - Refund amount: full purchase price (no restocking fee)`,
  },
  "claudecare://policies/escalation-triggers": {
    name: "Escalation Trigger Criteria",
    content: `Mandatory escalation conditions (use escalate_to_human):
      1. Customer explicitly requests a human agent
      2. Refund amount exceeds PKR 50,000 automated limit
      3. Policy gap: situation not covered by existing rules
      4. Three or more consecutive failed resolution attempts
      NOTE: Customer anger or frustration alone is NOT an
      escalation trigger — resolve based on policy, not tone.`,
  },
  "claudecare://policies/customer-tiers": {
    name: "Customer Tier Definitions",
    content: `ClaudeCare Customer Tiers:
      - Standard: base support, 24-hour response SLA
      - Premium: priority queue, 4-hour response SLA,
        eligible for expedited refund processing
      - Enterprise: dedicated agent, 1-hour response SLA,
        custom return window negotiable`,
  },
};

/**
 * Retrieves resource content for a given URI.
 *
 * @param {string} uri - The resource URI string (e.g. 'claudecare://policies/refund-limits').
 * @returns {Object} Resource object containing URI, name, and content, or structured error if unknown.
 */
export function getResource(uri) {
  const resource = resources[uri];
  if (!resource) {
    return {
      isError: true,
      errorCategory: "business",
      isRetryable: false,
      description: `Resource not found for URI: ${uri}`,
    };
  }
  return {
    uri,
    name: resource.name,
    content: resource.content,
  };
}
