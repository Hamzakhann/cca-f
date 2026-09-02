import { toolExecutors } from "../index.js";

const errorCases = [
  {
    name: "get_customer invalid format",
    action: () => toolExecutors.get_customer({ customer_id: "INVALID" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "get_customer unknown customer",
    action: () => toolExecutors.get_customer({ customer_id: "C-9999" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "get_customer database timeout",
    action: () => toolExecutors.get_customer({ customer_id: "C-0000" }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
  {
    name: "process_refund over PKR 50,000 limit",
    action: () => toolExecutors.process_refund({ customer_id: "C-1001", amount: 75000, reason: "test" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "escalate_to_human empty reason",
    action: () => toolExecutors.escalate_to_human({ customer_id: "C-1001", reason: "" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "get_invoice invalid format",
    action: () => toolExecutors.get_invoice({ invoice_id: "BADINPUT" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "get_invoice unknown invoice",
    action: () => toolExecutors.get_invoice({ invoice_id: "INV-9999" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "get_invoice database timeout",
    action: () => toolExecutors.get_invoice({ invoice_id: "INV-0000" }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
  {
    name: "check_payment_history invalid format",
    action: () => toolExecutors.check_payment_history({ customer_id: "BADINPUT" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "check_payment_history unknown customer",
    action: () => toolExecutors.check_payment_history({ customer_id: "C-9999" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "check_payment_history database timeout",
    action: () => toolExecutors.check_payment_history({ customer_id: "C-0000" }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
  {
    name: "check_return_eligibility invalid format",
    action: () => toolExecutors.check_return_eligibility({ order_id: "BADINPUT", days_since_purchase: 10 }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "check_return_eligibility invalid days_since_purchase",
    action: () => toolExecutors.check_return_eligibility({ order_id: "ORD-5001", days_since_purchase: -1 }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "check_return_eligibility unknown order",
    action: () => toolExecutors.check_return_eligibility({ order_id: "ORD-9999", days_since_purchase: 10 }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "check_return_eligibility database timeout",
    action: () => toolExecutors.check_return_eligibility({ order_id: "ORD-0000", days_since_purchase: 10 }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
  {
    name: "check_api_status invalid endpoint",
    action: () => toolExecutors.check_api_status({ endpoint: "" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "check_api_status unknown endpoint",
    action: () => toolExecutors.check_api_status({ endpoint: "unknown-api" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "check_api_status timeout",
    action: () => toolExecutors.check_api_status({ endpoint: "END-0000" }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
  {
    name: "get_error_logs invalid customer_id",
    action: () => toolExecutors.get_error_logs({ customer_id: "BADINPUT" }),
    expectedCategory: "validation",
    expectedRetryable: true,
  },
  {
    name: "get_error_logs unknown customer",
    action: () => toolExecutors.get_error_logs({ customer_id: "C-9999" }),
    expectedCategory: "business",
    expectedRetryable: false,
  },
  {
    name: "get_error_logs timeout",
    action: () => toolExecutors.get_error_logs({ customer_id: "C-0000" }),
    expectedCategory: "transient",
    expectedRetryable: true,
  },
];

async function runErrorTests() {
  console.log("==========================================");
  console.log("   STRUCTURED ERROR RESPONSE TEST SUITE   ");
  console.log("==========================================");

  let passed = 0;

  for (const testCase of errorCases) {
    const res = await testCase.action();
    const isErrorValid =
      res &&
      res.isError === true &&
      res.errorCategory === testCase.expectedCategory &&
      res.isRetryable === testCase.expectedRetryable &&
      typeof res.description === "string" &&
      res.description.trim().length > 0;

    if (isErrorValid) {
      console.log(`[PASS] ${testCase.name}`);
      console.log(`       Category: ${res.errorCategory} | Retryable: ${res.isRetryable}`);
      console.log(`       Description: "${res.description}"`);
      passed++;
    } else {
      console.log(`[FAIL] ${testCase.name}`);
      console.log(`       Expected: category=${testCase.expectedCategory}, retryable=${testCase.expectedRetryable}`);
      console.log(`       Received: ${JSON.stringify(res, null, 2)}`);
    }
  }

  console.log("\n------------------------------------------");
  console.log(`SUMMARY: ${passed}/${errorCases.length} error responses correct`);
  console.log("------------------------------------------");

  if (passed !== errorCases.length) {
    process.exit(1);
  }
}

runErrorTests().catch((err) => {
  console.error("Error Test Failure:", err);
  process.exit(1);
});
