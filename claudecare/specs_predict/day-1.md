### SPEC 
loop.js accepts a user message and a list of available tools. 
It calls the Claude API, inspects stop_reason on every response, 
executes any requested tools by name, appends both the assistant response
and tool results to the messages array, and loops until stop_reason === "end_turn".
Every iteration is logged to console. On end_turn, it returns Claude's final text response.

### PREDICTED EXECUTION 
Iteration 1:
  SEND: user message "What's the name of customer C-1001?"
  INSPECT: stop_reason = "tool_use"
  LOG: "Iteration 1 | stop_reason: tool_use | tool: get_customer | args: { customer_id: 'C-1001' }"
  EXECUTE: get_customer("C-1001") → { name: "Ahmed Ali", status: "active" }
  APPEND: assistant message + tool result

Iteration 2:
  SEND: full messages array including tool result
  INSPECT: stop_reason = "end_turn"
  LOG: "Iteration 2 | stop_reason: end_turn"
  EXIT loop

Final output:
  "The name of customer C-1001 is Ahmed Ali."

