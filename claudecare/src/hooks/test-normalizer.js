import { normalizeToolResult } from './normalizer.js'

// Test 1: Unix timestamp + status code conversion
const invoiceResult = JSON.stringify({
    invoice_id: "INV-1001",
    date: 1754006400,
    status: 2,
    amount: 12500
})
console.log("=== Test 1: get_invoice (should transform) ===")
console.log(normalizeToolResult('get_invoice', invoiceResult))

// Test 2: Pass-through for unrelated tool
const orderResult = JSON.stringify({
    order_id: "ORD-5001",
    date: "2026-08-01",
    amount: 15000
})
console.log("=== Test 2: get_order (should pass through unchanged) ===")
console.log(normalizeToolResult('get_order', orderResult))

// Test 3: Already ISO date — should not double-convert
const alreadyISO = JSON.stringify({
    invoice_id: "INV-2002",
    date: "2026-08-01",
    status: 1,
    amount: 5000
})
console.log("=== Test 3: ISO date already (status converts, date stays) ===")
console.log(normalizeToolResult('get_invoice', alreadyISO))