// demonstrate-env-expansion.js
// No API calls needed.
// This concept is about configuration — we prove it with file analysis.

import fs   from "fs"
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env" })

// ── Helper ────────────────────────────────────────────────────────
function printDivider(title) {
  console.log("\n" + "=".repeat(58))
  console.log(title)
  console.log("=".repeat(58))
}

// ── Simulate ${VAR} expansion ─────────────────────────────────────
// This is what Claude Code does internally when it reads .mcp.json
function expandEnvVars(value, env = process.env) {
  if (typeof value !== "string") return value
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const resolved = env[varName]
    if (!resolved) {
      console.warn(`  ⚠️  Warning: ${varName} is not set in environment`)
      return match  // return original placeholder if not found
    }
    return resolved
  })
}

function expandConfig(config, env = process.env) {
  const result = {}
  for (const [serverName, serverConfig] of Object.entries(config.mcpServers || {})) {
    result[serverName] = {
      ...serverConfig,
      env: {}
    }
    for (const [key, value] of Object.entries(serverConfig.env || {})) {
      result[serverName].env[key] = expandEnvVars(value, env)
    }
  }
  return { mcpServers: result }
}

// ── Audit a config for security ───────────────────────────────────
function auditConfig(config, filename) {
  const issues   = []
  const safe     = []
  const content  = JSON.stringify(config)

  for (const [serverName, serverConfig] of Object.entries(config.mcpServers || {})) {
    for (const [key, value] of Object.entries(serverConfig.env || {})) {
      const isExpanded = typeof value === "string" &&
                         value.startsWith("${") &&
                         value.endsWith("}")
      if (isExpanded) {
        safe.push(`  ✅ ${serverName}.env.${key} = ${value} (safe)`)
      } else if (typeof value === "string" && value.length > 8) {
        issues.push(`  ❌ ${serverName}.env.${key} = "${value.slice(0, 20)}..." (EXPOSED)`)
      }
    }
  }

  console.log(`\nAudit: ${filename}`)
  safe.forEach(s => console.log(s))
  issues.forEach(i => console.log(i))

  if (issues.length === 0) {
    console.log(`  Result: ✅ SAFE TO COMMIT`)
  } else {
    console.log(`  Result: ❌ DO NOT COMMIT — rotate exposed secrets immediately`)
  }

  return { safe: issues.length === 0, issueCount: issues.length }
}

async function main() {
  console.log("ENVIRONMENT VARIABLE EXPANSION DEMONSTRATION")
  console.log("Proving: ${VAR} keeps secrets out of git\n")

  // ── Create the three pattern files ───────────────────────────
  const SECURE_CONFIG = {
    mcpServers: {
      "claudecare-tools": {
        command: "node",
        args: ["src/mcp/server.js"],
        env: {
          ANTHROPIC_API_KEY:    "${ANTHROPIC_API_KEY}",
          CLAUDECARE_API_TOKEN: "${CLAUDECARE_API_TOKEN}",
          DB_URL:               "${CLAUDECARE_DB_URL}"
        }
      }
    }
  }

  const DANGEROUS_CONFIG = {
    mcpServers: {
      "claudecare-tools": {
        command: "node",
        args: ["src/mcp/server.js"],
        env: {
          ANTHROPIC_API_KEY:    "sk-ant-api03-this-is-a-real-key-abc123",
          CLAUDECARE_API_TOKEN: "token-real-value-xyz789",
          DB_URL:               "postgresql://admin:password123@db.prod.com/claudecare"
        }
      }
    }
  }

  // Write files
  fs.writeFileSync("secure.mcp.json",    JSON.stringify(SECURE_CONFIG,    null, 2))
  fs.writeFileSync("dangerous.mcp.json", JSON.stringify(DANGEROUS_CONFIG, null, 2))

  // ── Pattern 1: Secure ─────────────────────────────────────────
  printDivider("PATTERN 1 — SECURE: Using ${VAR} Expansion")

  console.log("\nFile content (safe to commit):")
  console.log(JSON.stringify(SECURE_CONFIG, null, 2))

  auditConfig(SECURE_CONFIG, "secure.mcp.json")

  // Simulate what Claude Code does at runtime
  console.log("\nWhat Claude Code resolves at runtime:")

  // Use real env var if available, otherwise show demo value
  const demoEnv = {
    ANTHROPIC_API_KEY:    process.env.ANTHROPIC_API_KEY || "sk-ant-RESOLVED-FROM-ENV",
    CLAUDECARE_API_TOKEN: process.env.CLAUDECARE_API_TOKEN || "token-RESOLVED-FROM-ENV",
    CLAUDECARE_DB_URL:    process.env.CLAUDECARE_DB_URL || "postgresql://RESOLVED-FROM-ENV"
  }

  const resolved = expandConfig(SECURE_CONFIG, demoEnv)
  for (const [serverName, serverConfig] of Object.entries(resolved.mcpServers)) {
    for (const [key, value] of Object.entries(serverConfig.env)) {
      // Mask the real value for display
      const masked = value.slice(0, 12) + "..." + value.slice(-4)
      console.log(`  ${key}: ${masked} ← resolved from environment`)
    }
  }

  console.log(`
Lifecycle:
  1. Developer sets ANTHROPIC_API_KEY in their .env file
  2. Claude Code starts, reads secure.mcp.json
  3. Sees "\${ANTHROPIC_API_KEY}" → looks up process.env.ANTHROPIC_API_KEY
  4. Substitutes real value in memory only
  5. MCP server starts with the real key
  6. The file on disk still shows "\${ANTHROPIC_API_KEY}"
  7. Git never sees the real value
  `)

  // ── Pattern 2: Dangerous ──────────────────────────────────────
  printDivider("PATTERN 2 — DANGEROUS: Hardcoded Secrets")

  console.log("\nFile content (NEVER commit this):")
  console.log(JSON.stringify(DANGEROUS_CONFIG, null, 2))

  auditConfig(DANGEROUS_CONFIG, "dangerous.mcp.json")

  console.log(`
What happens when this gets committed:
  git add dangerous.mcp.json
  git commit -m "add mcp config"    ← secret is now in git forever

  git log -p dangerous.mcp.json     ← secret visible to anyone
  "sk-ant-api03-this-is-a-real-key-abc123"  ← there it is

Even after you fix it in the next commit:
  git show HEAD~1:dangerous.mcp.json  ← old version still accessible
  "sk-ant-api03-this-is-a-real-key-abc123"  ← still there

The only correct response:
  1. Rotate the key immediately (generate a new one)
  2. Assume the old key is compromised
  3. Replace with \${VAR} expansion going forward
  `)

  // ── What happens when VAR is not set ─────────────────────────
  printDivider("EDGE CASE: ${VAR} Not Set in Environment")

  console.log("\nScenario: developer forgot to set CLAUDECARE_API_TOKEN in .env")
  console.log()

  const incompleteEnv = {
    ANTHROPIC_API_KEY: "sk-ant-real-key",
    // CLAUDECARE_API_TOKEN intentionally missing
    CLAUDECARE_DB_URL: "postgresql://localhost/claudecare"
  }

  const partialResolved = expandConfig(SECURE_CONFIG, incompleteEnv)

  for (const [serverName, serverConfig] of Object.entries(partialResolved.mcpServers)) {
    for (const [key, value] of Object.entries(serverConfig.env)) {
      const unresolved = value.startsWith("${")
      console.log(`  ${key}: ${value} ${unresolved ? "⚠️  NOT RESOLVED" : "✅ resolved"}`)
    }
  }

  console.log(`
What happens:
  Claude Code starts but CLAUDECARE_API_TOKEN is "\${CLAUDECARE_API_TOKEN}"
  The MCP server starts without the token
  Any tool call that needs the token fails with a permission error
  
Solution:
  Add CLAUDECARE_API_TOKEN to your .env file
  Restart Claude Code
  `)

  // ── The .env file structure ───────────────────────────────────
  printDivider("THE .env FILE — What It Looks Like")

  const dotenvContent = `# ClaudeCare Development Environment
# This file is in .gitignore — NEVER commit this file

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-real-key-here

# ClaudeCare MCP Server
CLAUDECARE_API_TOKEN=your-real-token-here
CLAUDECARE_DB_URL=postgresql://localhost/claudecare_dev

# Optional: override for production
# CLAUDECARE_DB_URL=postgresql://prod-host/claudecare_prod
`
  console.log("\n.env file content (gitignored):")
  console.log(dotenvContent)

  // ── .gitignore verification ───────────────────────────────────
  printDivider(".gitignore VERIFICATION")

  // Check if .env is in gitignore
  let gitignoreContent = ""
  try {
    gitignoreContent = fs.readFileSync(
      path.join(process.cwd(), "..", "..", "..", "..", ".gitignore"),
      "utf8"
    )
  } catch {
    gitignoreContent = "# .gitignore not found at repo root"
  }

  const envIgnored  = gitignoreContent.includes(".env")
  const mcpIgnored  = gitignoreContent.includes(".mcp.json")

  console.log(`\n.env in .gitignore:      ${envIgnored  ? "✅ YES — correct" : "❌ NO — add it now"}`)
  console.log(`.mcp.json in .gitignore: ${mcpIgnored  ? "❌ YES — remove it" : "✅ NO — correct"}`)

  console.log(`
Rule:
  .env       → IN .gitignore     (contains real secrets)
  .mcp.json  → NOT in .gitignore (safe with \${VAR} expansion)
  `)

  // ── Cleanup ───────────────────────────────────────────────────
  fs.unlinkSync("secure.mcp.json")
  fs.unlinkSync("dangerous.mcp.json")

  // ── Final summary ─────────────────────────────────────────────
  printDivider("THE THREE RULES — NEVER FORGET")

  console.log(`
  Rule 1: Secrets → .env → gitignored
          Real values live here. Never commit this file.

  Rule 2: .mcp.json → \${VAR} syntax → committed
          Placeholders only. Safe for everyone to see.
          Claude Code resolves \${VAR} from environment at runtime.

  Rule 3: Accidental commit → rotate immediately
          git history is permanent. Deleting the value in the
          next commit does not remove it from history.
          The only fix: generate a new key.
  `)
}

main().catch(console.error)