// test-decomposition.js
import { client, runAgent } from "./loop.js"

// ── SHARED TOOLS — same tools used by both patterns ───────────────
const TOOLS = [
    {
        name: "read_feedback",
        description: `Reads customer feedback entries for a product.
Returns: product_id, feedback (array of: id, rating, comment, date).
Use when: you need raw customer feedback for analysis.
Example: { product_id: "PROD-001", limit: 10 }`,
        input_schema: {
            type: "object",
            properties: {
                product_id: { type: "string" },
                limit: { type: "number" }
            },
            required: ["product_id"]
        }
    },
    {
        name: "categorise_feedback",
        description: `Categorises feedback items by sentiment and topic.
Returns: categories (object with keys: positive, negative, neutral,
         each containing arrays of feedback ids and topics).
Use when: you have raw feedback and need to group it.
Example: { feedback_ids: ["F001", "F002"] }`,
        input_schema: {
            type: "object",
            properties: {
                feedback_ids: { type: "array", items: { type: "string" } }
            },
            required: ["feedback_ids"]
        }
    },
    {
        name: "calculate_score",
        description: `Calculates an overall satisfaction score.
Returns: score (0-100), breakdown (positive_pct, negative_pct, neutral_pct).
Use when: you have categorised feedback and need a numeric score.
Example: { positive: 45, negative: 10, neutral: 5 }`,
        input_schema: {
            type: "object",
            properties: {
                positive: { type: "number" },
                negative: { type: "number" },
                neutral: { type: "number" }
            },
            required: ["positive", "negative", "neutral"]
        }
    },
    {
        name: "generate_summary",
        description: `Generates a concise executive summary from analysis data.
Returns: summary (string), key_findings (array), recommendations (array).
Use when: you have a complete analysis and need a readable summary.
Example: { score: 78, top_issues: ["slow delivery"], top_praise: ["quality"] }`,
        input_schema: {
            type: "object",
            properties: {
                score: { type: "number" },
                top_issues: { type: "array", items: { type: "string" } },
                top_praise: { type: "array", items: { type: "string" } }
            },
            required: ["score"]
        }
    },
    {
        name: "check_urgent_issues",
        description: `Checks if any feedback contains urgent issues needing immediate action.
Returns: urgent (boolean), issues (array of: feedback_id, issue, severity).
Use when: you suspect there may be critical problems in the feedback.
Example: { product_id: "PROD-001" }`,
        input_schema: {
            type: "object",
            properties: {
                product_id: { type: "string" }
            },
            required: ["product_id"]
        }
    }
]

// ── EXECUTORS — mock data ─────────────────────────────────────────
const EXECUTORS = {
    read_feedback: async ({ product_id, limit = 5 }) => ({
        product_id,
        feedback: [
            { id: "F001", rating: 5, comment: "Excellent quality, fast delivery", date: "2026-08-01" },
            { id: "F002", rating: 2, comment: "Packaging was damaged on arrival", date: "2026-08-02" },
            { id: "F003", rating: 4, comment: "Good product, slightly expensive", date: "2026-08-03" },
            { id: "F004", rating: 1, comment: "Stopped working after 2 days — urgent issue!", date: "2026-08-04" },
            { id: "F005", rating: 5, comment: "Perfect, exactly as described", date: "2026-08-05" }
        ].slice(0, limit)
    }),

    categorise_feedback: async ({ feedback_ids }) => ({
        categories: {
            positive: { ids: ["F001", "F005"], topics: ["quality", "delivery", "accuracy"] },
            negative: { ids: ["F002", "F004"], topics: ["packaging", "durability"] },
            neutral: { ids: ["F003"], topics: ["price"] }
        }
    }),

    calculate_score: async ({ positive, negative, neutral }) => {
        const total = positive + negative + neutral
        const score = Math.round(((positive * 100) + (neutral * 50)) / total)
        return {
            score,
            breakdown: {
                positive_pct: Math.round(positive / total * 100),
                negative_pct: Math.round(negative / total * 100),
                neutral_pct: Math.round(neutral / total * 100)
            }
        }
    },

    generate_summary: async ({ score, top_issues, top_praise }) => ({
        summary: `Product satisfaction score: ${score}/100. ` +
            `Customers appreciate ${(top_praise || ["quality"]).join(", ")}. ` +
            `Main concerns: ${(top_issues || ["none"]).join(", ")}.`,
        key_findings: ["Strong positive sentiment overall", "Durability concerns need attention"],
        recommendations: ["Improve packaging", "Add quality check for durability"]
    }),

    check_urgent_issues: async ({ product_id }) => ({
        urgent: true,
        issues: [
            { feedback_id: "F004", issue: "Product failure after 2 days", severity: "high" }
        ]
    })
}

function printDivider(title) {
    console.log("\n" + "=".repeat(58))
    console.log(title)
    console.log("=".repeat(58))
}

// ── PATTERN 1: Prompt Chaining ────────────────────────────────────
async function runChain(productId) {

    // Step 1: Read feedback
    console.log("\n[Chain] Step 1: Reading feedback...")
    const feedback = await EXECUTORS.read_feedback({ product_id: productId })
    const ids = feedback.feedback.map(f => f.id)
    console.log(`  Got ${feedback.feedback.length} feedback items`)

    // Step 2: Categorise
    console.log("[Chain] Step 2: Categorising feedback...")
    const categories = await EXECUTORS.categorise_feedback({ feedback_ids: ids })
    const pos = categories.categories.positive.ids.length
    const neg = categories.categories.negative.ids.length
    const neu = categories.categories.neutral.ids.length
    console.log(`  Positive: ${pos}, Negative: ${neg}, Neutral: ${neu}`)

    // Step 3: Calculate score
    console.log("[Chain] Step 3: Calculating score...")
    const scoreData = await EXECUTORS.calculate_score({
        positive: pos, negative: neg, neutral: neu
    })
    console.log(`  Score: ${scoreData.score}/100`)

    // Step 4: Generate summary
    console.log("[Chain] Step 4: Generating summary...")
    const summary = await EXECUTORS.generate_summary({
        score: scoreData.score,
        top_issues: categories.categories.negative.topics,
        top_praise: categories.categories.positive.topics
    })

    return {
        pattern: "CHAINING",
        steps_executed: ["read_feedback", "categorise_feedback",
            "calculate_score", "generate_summary"],
        score: scoreData.score,
        summary: summary.summary,
        findings: summary.key_findings
    }
}

// ── PATTERN 2: Dynamic Adaptive ───────────────────────────────────
async function runAdaptive(productId) {
    const goal = `Analyse customer feedback for product ${productId}.
  
  Investigate the feedback thoroughly:
  - Start by reading the feedback
  - Check for any urgent issues that need immediate attention
  - Categorise and score the feedback
  - Generate a summary with your findings
  
  If you find urgent issues, prioritise reporting them clearly.
  Use your judgment about what to investigate based on what you find.`

    return await runAgent(goal, TOOLS, EXECUTORS, {
        verbose: true,
        systemPrompt: `You are a product feedback analyst.
Investigate customer feedback and produce a thorough analysis.
If you discover urgent issues during investigation, address them
before continuing with standard analysis.`
    })
}

async function main() {
    console.log("TASK DECOMPOSITION TEST")
    console.log("Proving: chaining for fixed pipelines, adaptive for investigation\n")

    // ── Test 1: Prompt Chaining ────────────────────────────────────
    printDivider("PATTERN 1: Prompt Chaining")
    console.log("Use case: standard monthly feedback report")
    console.log("Steps: FIXED — read → categorise → score → summarise")
    console.log("Same steps execute regardless of what the data contains\n")

    const chainResult = await runChain("PROD-001")

    console.log("\nChain Result:")
    console.log(`  Steps executed: ${chainResult.steps_executed.join(" → ")}`)
    console.log(`  Score: ${chainResult.score}/100`)
    console.log(`  Summary: ${chainResult.summary}`)

    await new Promise(r => setTimeout(r, 1000))

    // ── Test 2: Dynamic Adaptive ───────────────────────────────────
    printDivider("PATTERN 2: Dynamic Adaptive")
    console.log("Use case: thorough investigation — agent decides the path")
    console.log("Steps: EMERGENT — agent chooses based on what it finds")
    console.log("If urgent issues found: agent may change investigation order\n")

    const adaptiveResult = await runAdaptive("PROD-001")

    console.log("\nAdaptive Result:")
    console.log(adaptiveResult.slice(0, 400))

    // ── Comparison ─────────────────────────────────────────────────
    printDivider("COMPARISON")
    console.log(`
  PROMPT CHAINING:
    Path:          Fixed before execution
    Steps:         Always: read → categorise → score → summarise
    Reproducible:  Same input = same path = same output
    Best for:      Reports, pipelines, ETL, batch processing
    Auditable:     Yes — every step logged explicitly
    Weakness:      Cannot adapt when data is unexpected

  DYNAMIC ADAPTIVE:
    Path:          Emerges during execution
    Steps:         Model decides based on what it finds
    Reproducible:  Same input MAY produce different paths
    Best for:      Investigation, research, debugging, support
    Auditable:     Harder — path varies per run
    Strength:      Handles unexpected findings naturally

  KEY INSIGHT:
    The adaptive agent found the URGENT ISSUE (F004 — product
    failure) and likely addressed it before completing the
    standard analysis. The chain ran all 4 steps regardless.
    
    For a standard report: chaining is more reliable.
    For a real investigation: adaptive is more thorough.
  `)

    printDivider("THE DECISION RULE")
    console.log(`
  Use CHAINING when:
    ✅ "Generate the monthly expense report"
    ✅ "Review this PR and post findings"
    ✅ "Process these 500 feedback items"
    → Fixed steps, fixed order, fixed output format

  Use ADAPTIVE when:
    ✅ "Investigate why customer C-1001 is unhappy"
    ✅ "Debug this failing test"
    ✅ "Research the best approach for X"
    → Open-ended, investigative, path depends on findings
  `)
}

main().catch(console.error)