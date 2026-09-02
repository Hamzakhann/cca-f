# /agent-status

Shows the current state of ClaudeCare's agent architecture.

Steps:
1. Read src/agents/coordinator.js — show triage logic
2. Read src/agents/billingAgent.js — show tool list (5 tools)
3. Read src/agents/returnsAgent.js — show tool list (4 tools)
4. Read src/mcp/tools/index.js — show all 7 registered tools
5. Report:
   - Coordinator routing logic
   - Each agent's tool scope
   - Tools in registry but not assigned to any agent (if any)
   - Hooks active per agent
