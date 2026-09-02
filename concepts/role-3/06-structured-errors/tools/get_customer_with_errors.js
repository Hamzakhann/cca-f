// tools/get_customer_with_errors.js
// One tool demonstrating all 4 error categories correctly.
// Each error trigger is a specific input that causes that error type.

export const definition = {
    name: "get_customer",
    description: `Retrieves account-level profile data for a specific
customer by their unique customer ID.

Returns: customer_id (string), name (string), email (string),
account_status ('active'|'suspended'|'closed'),
account_tier ('standard'|'premium'|'enterprise'),
created_at (ISO 8601 date), currency ('PKR').

Use when: verifying customer identity, checking account status,
determining tier for routing decisions.

Do NOT use for: order details (use lookup_order),
payment history (use check_payment_history).

Example: { customer_id: 'C-1001' }`,
    input_schema: {
        type: "object",
        properties: {
            customer_id: {
                type: "string",
                description: "Customer ID in format C-XXXX (e.g. C-1001)"
            }
        },
        required: ["customer_id"]
    }
}

// Mock customer database
const CUSTOMERS = {
    "C-1001": {
        customer_id: "C-1001",
        name: "Ahmed Ali",
        email: "ahmed@example.com",
        account_status: "active",
        account_tier: "premium",
        created_at: "2022-03-15",
        currency: "PKR"
    },
    "C-1002": {
        customer_id: "C-1002",
        name: "Sara Khan",
        email: "sara@example.com",
        account_status: "active",
        account_tier: "standard",
        created_at: "2023-07-01",
        currency: "PKR"
    },
    "C-1003": {
        customer_id: "C-1003",
        name: "Bilal Ahmed",
        email: "bilal@example.com",
        account_status: "suspended",
        account_tier: "enterprise",
        created_at: "2021-11-20",
        currency: "PKR"
    }
}

export async function executor({ customer_id }) {

    // ── Trigger: C-0000 → transient error (database timeout) ─────
    if (customer_id === "C-0000") {
        return {
            isError: true,
            errorCategory: "transient",
            isRetryable: true,
            description: "Customer database timed out after 5 seconds. The service is temporarily under load — retry in a moment."
        }
    }

    // ── Trigger: invalid format → validation error ─────────────────
    const validFormat = /^C-\d{4}$/.test(customer_id)
    if (!validFormat) {
        return {
            isError: true,
            errorCategory: "validation",
            isRetryable: true,
            description: `Invalid customer_id format. Expected 'C-XXXX' where XXXX is a 4-digit number (e.g. 'C-1001'). Received: '${customer_id}'. Please provide a correctly formatted customer ID.`
        }
    }

    // ── Trigger: C-RESTRICTED → permission error ──────────────────
    if (customer_id === "C-9999") {
        return {
            isError: true,
            errorCategory: "permission",
            isRetryable: false,
            description: "Customer C-9999 is a restricted account that requires senior agent access. This automated agent does not have permission to view restricted accounts. Use escalate_to_human to route this to a senior agent."
        }
    }

    // ── Trigger: not in database → business error ──────────────────
    if (!CUSTOMERS[customer_id]) {
        return {
            isError: true,
            errorCategory: "business",
            isRetryable: false,
            description: `No customer found with ID ${customer_id}. The customer ID does not exist in the system. Verify the ID with the customer — they may have provided an incorrect number.`
        }
    }

    // ── Success ────────────────────────────────────────────────────
    return CUSTOMERS[customer_id]
}