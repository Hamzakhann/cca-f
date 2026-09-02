import { extractIssueWithReview } from "./issueExtractor.js";
import { extractWithRetry } from "./validator.js";

// Stage 2 Predictions:
//
// Message 1:
// PREDICT: { issue_type: "billing", severity: "high", action_required: "refund", escalation_requested: false, confidence: ~0.95 }
//
// Message 2:
// PREDICT: { issue_type: "returns", severity: "medium", action_required: "return", escalation_requested: false, confidence: ~0.90 }
//
// Message 3:
// PREDICT: { issue_type: "other" | "billing", severity: "high", action_required: "escalate", escalation_requested: true, confidence: ~0.90 }
//
// Message 4:
// PREDICT: { issue_type: "technical" | "billing", severity: "medium", action_required: "investigate", escalation_requested: false, confidence: ~0.65 }
//
// Message 5:
// PREDICT: { issue_type: "technical", severity: "high", action_required: "investigate", escalation_requested: false, confidence: ~0.90 }

const testMessages = [
  {
    id: 1,
    description: "Clear billing dispute",
    text: "Hi, customer C-1001 here. I was charged PKR 12,500 twice on invoice INV-1001 on two consecutive days. Please investigate and refund the duplicate charge.",
  },
  {
    id: 2,
    description: "Clear return request",
    text: "I want to return the laptop I bought 5 days ago on order ORD-5002. It's not working properly. Can I get a refund?",
  },
  {
    id: 3,
    description: "Explicit escalation demand",
    text: "I've been waiting 3 days for a response. This is unacceptable. I demand to speak to a senior manager immediately.",
  },
  {
    id: 4,
    description: "Ambiguous — anger but specific issue",
    text: "I'm really frustrated. I think there's something wrong with my account C-1002 but I'm not sure what. The app keeps showing errors when I try to view my invoices.",
  },
  {
    id: 5,
    description: "Technical issue",
    text: "Our API integration keeps failing with authentication errors. Customer C-1003. The SDK throws a 401 on every call after the first one.",
  },
];

async function runTests() {
  console.log("==========================================");
  console.log("Running Support Issue Extraction Test Suite");
  console.log("==========================================\n");

  for (const msg of testMessages) {
    console.log(`--- Message ${msg.id}: ${msg.description} ---`);
    console.log(`Input: "${msg.text}"`);

    try {
      const result = await extractWithRetry(msg.text);
      console.log("Result:", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`Error processing message ${msg.id}:`, err);
    }
    console.log("\n");
  }
}

runTests();
