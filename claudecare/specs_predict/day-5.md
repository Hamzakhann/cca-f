### SPEC 
Retrieves a specific invoice record by invoice ID. Returns invoice amount, status, payment count, issue date, and currency. Explicitly distinguishes from get_customer (account info) and check_payment_history (payment transaction list). A payment_count > 1 on a single invoice is the signal for a potential duplicate charge. Handles invalid format, unknown invoice, and transient errors.


### PREDICTED EXECUTION 
executor({ invoice_id: "INV-1001" })
→ { invoice_id: "INV-1001", amount: 12500, currency: "PKR",
    status: "paid", payment_count: 2, issue_date: "2026-08-01" }

executor({ invoice_id: "INV-9999" })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "No invoice found with ID INV-9999." }

executor({ invoice_id: "BADINPUT" })
→ { isError: true, errorCategory: "validation", isRetryable: true,
    description: "Invalid invoice_id format. Expected INV-XXXX." }


### SPEC 
Retrieves the full list of payment transactions for a customer. Returns an array of individual payment records — each with payment ID, date, amount, and status. This is the tool for detecting duplicate payments: two records on the same invoice for the same amount on consecutive days. Explicitly distinguishes from get_invoice (the invoice record itself) and get_customer (account info).

### PREDICTED EXECUTION 
executor({ customer_id: "C-1001" })
→ { customer_id: "C-1001", currency: "PKR",
    payments: [
      { payment_id: "PAY-8001", invoice_id: "INV-1001",
        date: "2026-08-01", amount: 12500, status: "completed" },
      { payment_id: "PAY-8002", invoice_id: "INV-1001",
        date: "2026-08-02", amount: 12500, status: "completed" }
    ]}

executor({ customer_id: "C-9999" })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "No customer found with ID C-9999." }


### SPEC 
Determines whether a specific order is eligible for return based on days since purchase. Returns eligibility boolean, reason, refund amount if eligible, and days remaining in the return window. The 30-day window is the business rule — hardcoded in the tool logic, not derived from a policy lookup. Explicitly distinguishes from lookup_order (retrieves order details) and process_refund (executes the refund).


### PREDICTED EXECUTION 
executor({ order_id: "ORD-5001", days_since_purchase: 12 })
→ { order_id: "ORD-5001", eligible: true,
    reason: "within 30-day return window",
    days_remaining: 18, refund_amount: 15000, currency: "PKR" }

executor({ order_id: "ORD-5001", days_since_purchase: 35 })
→ { order_id: "ORD-5001", eligible: false,
    reason: "outside 30-day return window",
    days_remaining: 0, refund_amount: 0, currency: "PKR" }

executor({ order_id: "ORD-9999", days_since_purchase: 5 })
→ { isError: true, errorCategory: "business", isRetryable: false,
    description: "No order found with ID ORD-9999." }