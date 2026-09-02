// tools/payment_history_tools.js
// Three versions of check_payment_history.
// Version 1: BAD — returns empty on access failure (silent bug)
// Version 2: GOOD — returns structured error on access failure
// Version 3: GOOD — returns valid empty when data source confirms no records

// Shared tool definition
export const definition = {
    name: "check_payment_history",
    description: `Retrieves ALL payment transactions for a customer.

Returns: customer_id (string), currency ('PKR'), payments (array).
Empty payments array means the data source confirmed no records exist.
If an error is returned, it means the data source could not be reached —
do not interpret this as "no payments found".

Use when: investigating duplicate charges, verifying refund status.

Do NOT use for: order details (use lookup_order).

Example: { customer_id: 'C-1001' }`,
    input_schema: {
        type: "object",
        properties: {
            customer_id: {
                type: "string",
                description: "Customer ID in format C-XXXX"
            }
        },
        required: ["customer_id"]
    }
}

// Real payment data — exists in the "database"
const PAYMENT_DATA = {
    "C-1001": {
        payments: [
            {
                payment_id: "PAY-8001", invoice_id: "INV-1001",
                date: "2026-08-01", amount: 12500, status: "completed"
            },
            {
                payment_id: "PAY-8002", invoice_id: "INV-1001",
                date: "2026-08-02", amount: 12500, status: "completed"
            }
        ]
    },
    "C-1002": {
        payments: [] // This customer genuinely has no payment history
    }
}

// Simulates what "mode" the tool is in for testing
let currentMode = "normal"
export function setMode(mode) { currentMode = mode }

// VERSION 1 — BAD: swallows access failures as empty results
export async function badExecutor({ customer_id }) {
    try {
        if (currentMode === "timeout") {
            throw new Error("TIMEOUT: database connection timed out after 5s")
        }
        if (currentMode === "unavailable") {
            throw new Error("ECONNREFUSED: service unavailable")
        }

        const data = PAYMENT_DATA[customer_id]
        if (!data) {
            return {
                isError: true,
                errorCategory: "business",
                isRetryable: false,
                description: `No customer found: ${customer_id}`
            }
        }

        return { customer_id, currency: "PKR", payments: data.payments }

    } catch (err) {
        // ❌ BAD: swallowing the access failure as empty data
        console.log(`[BAD EXECUTOR] Caught error: ${err.message}`)
        console.log(`[BAD EXECUTOR] Hiding it as empty payments array`)
        return {
            customer_id,
            currency: "PKR",
            payments: []  // ← This is the silent bug
        }
    }
}

// VERSION 2 — GOOD: returns structured error on access failure
export async function goodExecutor({ customer_id }) {
    try {
        if (currentMode === "timeout") {
            throw new Error("TIMEOUT: database connection timed out after 5s")
        }
        if (currentMode === "unavailable") {
            throw new Error("ECONNREFUSED: service unavailable")
        }

        const data = PAYMENT_DATA[customer_id]
        if (!data) {
            return {
                isError: true,
                errorCategory: "business",
                isRetryable: false,
                description: `No customer found: ${customer_id}`
            }
        }

        return { customer_id, currency: "PKR", payments: data.payments }

    } catch (err) {
        // ✅ GOOD: access failure is explicit
        const isTimeout = err.message.includes("TIMEOUT") ||
            err.message.includes("ECONNREFUSED")

        return {
            isError: true,
            errorCategory: isTimeout ? "transient" : "transient",
            isRetryable: true,
            description: `Cannot access payment history database: ${err.message}. This is a connection issue — retry to get accurate results. Do NOT interpret this as "no payments found".`
        }
    }
}

// VERSION 3 — Valid empty result
// Customer C-1002 genuinely has no payment history
// Data source confirmed this — returns empty array correctly
export async function emptyResultExecutor({ customer_id }) {
    // Normal operation — no errors
    const data = PAYMENT_DATA[customer_id]
    if (!data) {
        return {
            isError: true,
            errorCategory: "business",
            isRetryable: false,
            description: `No customer found: ${customer_id}`
        }
    }
    // C-1002 returns { payments: [] } — valid empty, not an error
    return { customer_id, currency: "PKR", payments: data.payments }
}