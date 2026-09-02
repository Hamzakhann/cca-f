# API Conventions

## Anthropic SDK Usage
- Always use model: "claude-sonnet-4-6"
- max_tokens: 1024 for tool-heavy agents, 2048 for synthesis
- Always pass tools array from src/mcp/tools/index.js — never
  define tools inline inside agent files

## Message Structure
- User messages: plain string or content array
- Tool results: must use tool_result content block with
  matching tool_use_id from the assistant response
- Assistant messages: append response.content exactly as returned
  — never modify before appending to messages array

## Error Handling
- All tool executor errors return structured objects, never throw
- Coordinator receives partial results + error context from
  subagents — never receives raw exceptions
- Log errors to console.error, never console.log

## Currency
- All amounts: PKR (Pakistani Rupees)
- Format: PKR X,XXX.XX with comma thousands separator
- Arithmetic: always Decimal, never float
- Mock data: always include currency: "PKR" in return objects

## Environment
- API keys: loaded from .env via dotenv
- Never hardcode credentials — use process.env.VARIABLE_NAME
- .env is gitignored — .mcp.json is committed
