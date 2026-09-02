import { guardRefund } from './refundGuard.js'

const cases = [
  { amount: 49999, label: "PKR 49,999 — should ALLOW" },
  { amount: 50000, label: "PKR 50,000 — should ALLOW (boundary)" },
  { amount: 50001, label: "PKR 50,001 — should BLOCK" },
  { amount: 100000, label: "PKR 100,000 — should BLOCK" },
]

for (const { amount, label } of cases) {
  console.log(`\n--- ${label} ---`)
  const result = guardRefund('process_refund', { customer_id: 'C-1001', amount })
  console.log("blocked:", result.blocked)
  if (result.blocked) console.log("redirectTo:", result.redirectTo)
}

// Non-refund tool — must pass through silently
console.log("\n--- get_invoice — should pass silently ---")
console.log(guardRefund('get_invoice', { invoice_id: 'INV-1001' }))