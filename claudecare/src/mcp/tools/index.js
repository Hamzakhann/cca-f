import * as get_customer from "./get_customer.js";
import * as lookup_order from "./lookup_order.js";
import * as process_refund from "./process_refund.js";
import * as escalate_to_human from "./escalate_to_human.js";
import * as get_invoice from "./get_invoice.js";
import * as check_payment_history from "./check_payment_history.js";
import * as check_return_eligibility from "./check_return_eligibility.js";
import * as check_api_status from "./check_api_status.js";
import * as get_error_logs from "./get_error_logs.js";

/**
 * Array of Anthropic/MCP tool definition schemas passed when invoking Claude API.
 */
export const toolDefinitions = [
  get_customer.definition,
  lookup_order.definition,
  process_refund.definition,
  escalate_to_human.definition,
  get_invoice.definition,
  check_payment_history.definition,
  check_return_eligibility.definition,
  check_api_status.definition,
  get_error_logs.definition,
];

/**
 * Object mapping tool name string to executor function called during tool execution loop.
 */
export const toolExecutors = {
  get_customer: get_customer.executor,
  lookup_order: lookup_order.executor,
  process_refund: process_refund.executor,
  escalate_to_human: escalate_to_human.executor,
  get_invoice: get_invoice.executor,
  check_payment_history: check_payment_history.executor,
  check_return_eligibility: check_return_eligibility.executor,
  check_api_status: check_api_status.executor,
  get_error_logs: get_error_logs.executor,
};
