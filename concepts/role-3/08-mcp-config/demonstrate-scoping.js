// demonstrate-scoping.js
// This script demonstrates the difference between the two files
// by reading both (if they exist) and showing what each contains.
// No API calls needed — this is a configuration concept.

import fs from "fs"
import path from "path"
import os from "os"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env" })

// ── Create a sample .mcp.json ────────────────────────────────────
const PROJECT_MCP = {
  mcpServers: {
    "claudecare-tools": {
      command: "node",
      args: ["src/mcp/server.js"],
      env: {
        ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}",
        CLAUDECARE_API_TOKEN: "${CLAUDECARE_API_TOKEN}"
      }
    }
  }
}

// ── Create a sample user-level config ────────────────────────────
const USER_LEVEL_CONFIG = {
  mcpServers: {
    "my-personal-experiment": {
      command: "node",
      args: ["~/personal-tools/experimental-server.js"],
      env: {
        PERSONAL_API_KEY: "${MY_PERSONAL_KEY}"
      }
    }
  }
}

function printDivider(title) {
  console.log("\n" + "=".repeat(55))
  console.log(title)
  console.log("=".repeat(55))
}

function analyzeConfig(configPath, content, scope) {
  console.log(`\nFile: ${configPath}`)
  console.log(`Scope: ${scope}`)

  // Check for hardcoded secrets (dangerous pattern)
  const contentStr = JSON.stringify(content, null, 2)
  const hasHardcodedSecrets = contentStr.match(/"(sk-|pk-|api-)[a-zA-Z0-9_-]{10,}"/)
  const hasEnvVarExpansion  = contentStr.includes("${")
  const serverCount = Object.keys(content.mcpServers || {}).length

  console.log(`\nAnalysis:`)
  console.log(`  Servers configured: ${serverCount}`)
  console.log(`  Uses \${VAR} expansion: ${hasEnvVarExpansion ? "✅ YES" : "❌ NO — secrets may be exposed"}`)
  console.log(`  Hardcoded secrets detected: ${hasHardcodedSecrets ? "❌ YES — DANGER" : "✅ NO"}`)

  // Check each server
  const servers = content.mcpServers || {}
  for (const [name, config] of Object.entries(servers)) {
    console.log(`\n  Server: "${name}"`)
    console.log(`    command: ${config.command} ${config.args?.join(" ")}`)
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        const isSafe = value.startsWith("${") && value.endsWith("}")
        const status = isSafe ? "✅ safe" : "❌ EXPOSED"
        console.log(`    env.${key}: ${value} ← ${status}`)
      }
    }
  }
}

async function main() {
  console.log("MCP CONFIGURATION SCOPING DEMONSTRATION")
  console.log("Understanding .mcp.json vs ~/.claude.json\n")

  // ── Write sample files ────────────────────────────────────────
  const projectMcpPath = "./project-repo/.mcp.json"
  const userConfigPath  = path.join(os.homedir(), ".claude-concept-demo.json")
  // Note: using .claude-concept-demo.json so we don't affect real ~/.claude.json

  fs.mkdirSync("./project-repo", { recursive: true })
  fs.writeFileSync(projectMcpPath, JSON.stringify(PROJECT_MCP, null, 2))
  fs.writeFileSync(userConfigPath, JSON.stringify(USER_LEVEL_CONFIG, null, 2))

  // ── Demonstrate project-level ─────────────────────────────────
  printDivider("FILE 1: .mcp.json — Project Level")
  console.log(`
Purpose: Team-shared MCP server configuration.
Location: Repository root — committed to git.
Who gets it: EVERY developer who clones this repo.
When to use: Tools the whole team needs for this project.
  `)
  analyzeConfig(
    projectMcpPath,
    JSON.parse(fs.readFileSync(projectMcpPath, "utf8")),
    "PROJECT — committed, shared with all developers"
  )

  console.log(`
What happens when a new developer clones the repo:
  git clone https://github.com/team/claudecare
  → .mcp.json is there immediately
  → They set ANTHROPIC_API_KEY in their .env
  → Claude Code discovers claudecare-tools on first session
  → ✅ All tools available day one
  `)

  // ── Demonstrate user-level ────────────────────────────────────
  printDivider("FILE 2: ~/.claude.json — User Level")
  console.log(`
Purpose: Personal MCP configuration for experimental tools.
Location: Home directory — NEVER committed to git.
Who gets it: ONLY you, on THIS machine.
When to use: Personal tools, experiments, tools only you need.
  `)
  analyzeConfig(
    userConfigPath,
    JSON.parse(fs.readFileSync(userConfigPath, "utf8")),
    "USER — personal only, never shared"
  )

  console.log(`
What happens when a new developer clones the repo:
  git clone https://github.com/team/claudecare
  → ~/.claude.json does NOT come with the repo
  → New developer has NO personal tools configured
  → Their Claude Code session is missing your personal tools
  → ✅ Expected — personal tools are personal
  `)

  // ── The dangerous version ─────────────────────────────────────
  printDivider("DANGEROUS VERSION — Hardcoded Secrets in .mcp.json")

  const DANGEROUS_CONFIG = {
    mcpServers: {
      "claudecare-tools": {
        command: "node",
        args: ["src/mcp/server.js"],
        env: {
          ANTHROPIC_API_KEY: "sk-ant-api03-real-secret-key-here",
          CLAUDECARE_API_TOKEN: "token-abc123-real-value"
        }
      }
    }
  }

  console.log(`
This is what NEVER to commit:
  `)
  console.log(JSON.stringify(DANGEROUS_CONFIG, null, 2))
  console.log(`
Why this is catastrophic:
  1. You commit this to git
  2. GitHub/GitLab stores it forever (even if you delete it later)
  3. Anyone with repo access has your API key
  4. Your key gets scraped by bots within minutes
  5. You get billed for someone else's API usage
  6. Rotating the key means updating every developer's .env
  
  The fix: ALWAYS use \${ENV_VAR} expansion.
  The key lives in .env (gitignored). The file is safe to commit.
  `)

  // ── The .gitignore audit ──────────────────────────────────────
  printDivider("GITIGNORE AUDIT — What should and should not be ignored")

  const gitignoreRules = [
    { file: ".env",        should_ignore: true,
      reason: "Contains real secret values — NEVER commit" },
    { file: ".mcp.json",   should_ignore: false,
      reason: "Team config — safe to commit with ${VAR} expansion" },
    { file: "node_modules",should_ignore: true,
      reason: "Dependencies — never commit" },
    { file: "*.log",       should_ignore: true,
      reason: "Log files — never commit" },
  ]

  console.log()
  for (const { file, should_ignore, reason } of gitignoreRules) {
    const status = should_ignore ? "IN .gitignore ✅" : "NOT in .gitignore ✅"
    const wrong  = should_ignore ? "NOT in .gitignore ❌" : "IN .gitignore ❌"
    console.log(`${file.padEnd(20)} → ${status}`)
    console.log(`${"".padEnd(20)}   (${reason})`)
    console.log()
  }

  // ── The exam scenario ─────────────────────────────────────────
  printDivider("THE EXAM SCENARIO — Diagnose This")

  console.log(`
Scenario:
  Developer A configures MCP tools. Everything works on their machine.
  Developer B clones the same repo. No MCP tools available.
  
  Question: What went wrong?

  Clue 1: Developer A's tools work perfectly
  Clue 2: Developer B cloned the same repository
  Clue 3: Developer B has no tools
  
  Diagnosis process:
  
  Step 1: Check the repository for .mcp.json
          Is it there? → configuration was committed correctly
          Not there?   → Developer A put it in ~/.claude.json ← ANSWER

  Step 2: If .mcp.json exists, check its content
          Has \${VAR} expansion? → check if Developer B set their .env
          Has hardcoded values?  → both should work (but dangerous)

  Step 3: If .mcp.json is in .gitignore
          Developer A tried to hide secrets by gitignoring the file
          Fix: use \${VAR} expansion, remove from .gitignore

  Most likely answer: ~/.claude.json was used instead of .mcp.json
  `)

  // ── Cleanup demo files ────────────────────────────────────────
  fs.unlinkSync(userConfigPath)
  console.log("\n✅ Demonstration complete. Demo files cleaned up.")

  printDivider("THE TWO RULES — NEVER FORGET")
  console.log(`
  Rule 1: Team tools → .mcp.json → commit it → everyone gets it

  Rule 2: Personal tools → ~/.claude.json → never commit → only you have it

  Bonus rule: Secrets → .env → gitignored → ${"{VAR}"} in .mcp.json
  `)
}

main().catch(console.error)