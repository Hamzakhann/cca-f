### SPEC 
Retrieves account-level customer information by customer ID. Returns name, email, account status, tier, created date, and contact preference. Has explicit negative boundaries pointing to lookup_order for order data. Handles four error types: invalid ID format (validation), unknown customer (business), permission failure (permission), and database timeout (transient). Uses realistic mock data for three customers: C-1001, C-1002, C-1003.

### PREDICTED EXECUTION 
executor({ customer_id: "C-1001" })
→ { name: "Ahmed Ali", email: "ahmed@example.com", account_status: "active",
    account_tier: "premium", created_at: "2022-03-15", currency: "PKR" }

executor({ customer_id: "C-9999" })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "No customer found with ID C-9999. Verify the customer ID and try again." }

executor({ customer_id: "INVALID" })
→ { isError: true, errorCategory: "validation", isRetryable: true,
    description: "Invalid customer_id format. Expected 'C-XXXX'. Received: 'INVALID'" }


### SPEC 
Retrieves a specific order record by order ID. Returns item, purchase date, amount in PKR, payment status, and shipping status. Explicitly distinguishes itself from get_customer (account info) and process_refund (action tool). Handles order not found (business error), invalid format (validation error), and timeout (transient error). Mock data for three orders.

### PREDICTED EXECUTION 
executor({ order_id: "ORD-5001" })
→ { order_id: "ORD-5001", item: "Wireless Headphones",
    purchase_date: "2026-08-01", amount: 15000, currency: "PKR",
    payment_status: "paid", shipping_status: "delivered" }

executor({ order_id: "ORD-9999" })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "No order found with ID ORD-9999." }



### SPEC 
Processes an automated refund for a confirmed duplicate payment or approved return. This is an action tool — it changes state, not just retrieves data. Description must make this distinction clear. Has a hard business rule: amounts above PKR 50,000 are rejected with a business error (the hook catches this first, but the tool itself also enforces it as a fallback). Returns refund ID and confirmation on success.

### PREDICTED EXECUTION 
executor({ customer_id: "C-1001", amount: 12500, reason: "duplicate payment" })
→ { success: true, refund_id: "REF-001", amount: 12500,
    currency: "PKR", estimated_days: 5 }

executor({ customer_id: "C-1001", amount: 75000, reason: "contract dispute" })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "Refund of PKR 75,000 exceeds automated limit of PKR 50,000.
    Use escalate_to_human for refunds above this threshold." }




### SPEC 
Creates a structured escalation ticket for cases that exceed automated handling. This is also an action tool. Must require a structured handoff — customer ID, refund amount if applicable, reason for escalation. Returns a ticket ID and assigned agent tier. Description must list the three valid escalation triggers: customer request, policy gap, refund above limit.

### PREDICTED EXECUTION 
executor({ customer_id: "C-1001", reason: "refund exceeds PKR 50,000 limit",
           refund_amount: 75000 })
→ { escalated: true, ticket_id: "TKT-" + random,
    assigned_to: "Senior Billing Agent",
    priority: "high", estimated_response_hours: 4 }

executor({ customer_id: "C-1001", reason: "" })
→ { isError: true, errorCategory: "validation", isRetryable: true,
    description: "reason field is required and cannot be empty.
    Include: why this case cannot be resolved automatically." }