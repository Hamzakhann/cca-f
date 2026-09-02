# /review-tool

Reviews the description quality of a specific MCP tool file
against the 5-component standard.

Usage: /review-tool [tool-name]
Example: /review-tool get_customer

Steps:
1. Read src/mcp/tools/{tool-name}.js
2. Check the description against all 5 components:
   □ What it does
   □ What it returns (all fields)
   □ When to use it
   □ When NOT to use it
   □ Example input
3. List any missing or weak components
4. Suggest specific improvements for each gap
5. Rate overall description quality: Poor / Acceptable / Strong
