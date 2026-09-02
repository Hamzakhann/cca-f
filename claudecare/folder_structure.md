# ClaudeCare — Project Folder Structure

```text
claudecare/
├── .env                               ← Environment configuration (API key, uncommitted)
├── .gitignore                         ← Git ignore rules (includes .env, excludes .mcp.json)
├── .mcp.json                          ← Project-level MCP configuration
├── folder_structure.md                ← Project directory layout documentation
├── Learning.md                        ← Project learnings & architecture documentation
├── package.json                       ← Node.js project manifest
├── package-lock.json                  ← Dependency lockfile
└── src/
    ├── agent/                         ← Basic agent loop (Day 1)
    │   ├── loop.js                    ← Core Anthropic API message loop
    │   └── run.js                     ← CLI execution entrypoint
    ├── agents/                        ← Domain specialist agents (Days 2-3)
    │   ├── billingAgent.js            ← Billing dispute specialist (uses MCP tools)
    │   ├── returnsAgent.js            ← Return policy specialist (uses MCP tools)
    │   ├── technicalSupportAgent.js   ← Technical support specialist (uses MCP tools)
    │   ├── coordinator.js             ← Support coordinator (triage & synthesis)
    │   └── run-coordinator.js         ← Test runner for coordinator scenarios
    ├── hooks/                         ← Lifecycle hooks (Day 3)
    │   ├── index.js                   ← Hooks barrel file
    │   ├── normalizer.js              ← Post-tool-use result normalization
    │   ├── refundGuard.js             ← Pre-tool-call security guard
    │   ├── test-integration.js        ← Stress integration tests with hooks
    │   ├── test-normalizer.js        ← Normalizer test suite
    │   ├── test-refundGuard.js        ← Refund guard test suite
    │   └── testIndex.js               ← Hooks pipeline test runner
    └── mcp/                           ← Model Context Protocol layer
        ├── resources.js               ← Policy catalog MCP resources
        ├── server.js                  ← Minimal MCP server stub & tool registry
        ├── test-resources.js          ← Test suite for MCP resources
        ├── test-tool-choice.js        ← Test suite for tool_choice strategies (auto/any/tool)
        └── tools/                     ← Formal MCP tool schemas and executors
            ├── check_api_status.js         ← API operational status & health lookup
            ├── check_payment_history.js    ← Payment transaction history lookup
            ├── check_return_eligibility.js ← 30-day return window calculator
            ├── escalate_to_human.js        ← Human escalation trigger
            ├── get_customer.js             ← Customer account profile lookup
            ├── get_error_logs.js           ← Technical error log trace lookup
            ├── get_invoice.js              ← Invoice record & payment count lookup
            ├── lookup_order.js             ← Order details & status lookup
            ├── process_refund.js           ← Automated refund execution
            ├── index.js                    ← Tools barrel registry (all 9 tools)
            └── __tests__/                  ← Tool unit & integration test suites
                ├── test-check_api_status.js
                ├── test-check_payment_history.js
                ├── test-check_return_eligibility.js
                ├── test-errors.js
                ├── test-escalate_to_human.js
                ├── test-get_customer.js
                ├── test-get_error_logs.js
                ├── test-get_invoice.js
                ├── test-index.js
                ├── test-lookup_order.js
                ├── test-minimal-descriptions.js
                ├── test-process_refund.js
                └── test-selection.js
```
