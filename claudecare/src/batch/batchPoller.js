import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Anthropic();

/**
 * Polls the Anthropic Message Batches API until the batch processing finishes,
 * then retrieves and parses the batch results.
 *
 * @param {string} batchId - The ID of the batch to poll.
 * @param {number} [maxWaitMinutes=30] - Maximum duration to wait before timing out.
 * @returns {Promise<Object>} Formatted results with succeeded, failed, and summary.
 */
export async function pollBatch(batchId, maxWaitMinutes = 30) {
  const pollIntervalMs = 5000; // check every 5 seconds
  const maxAttempts = (maxWaitMinutes * 60 * 1000) / pollIntervalMs;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const batch = await client.beta.messages.batches.retrieve(batchId);

    console.log(`Poll ${attempts}: status=${batch.processing_status}`);

    if (batch.processing_status === "ended") {
      return await processResults(batchId, batch);
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `Batch ${batchId} did not complete within ${maxWaitMinutes} minutes`
  );
}

/**
 * Iterates through batch results, parsing successful JSON responses and tracking errors.
 *
 * @param {string} batchId - The ID of the batch.
 * @param {Object} batch - The batch status object from retrieve.
 * @returns {Promise<Object>} Succeeded & failed items with overall summary.
 */
async function processResults(batchId, batch) {
  const results = { succeeded: [], failed: [], summary: {} };

  const resultsStream = await client.beta.messages.batches.results(batchId);
  for await (const result of resultsStream) {
    if (result.result.type === "succeeded") {
      // Parse the JSON text response
      const text = result.result.message.content[0].text;
      try {
        const extraction = JSON.parse(text);
        results.succeeded.push({
          custom_id: result.custom_id,
          extraction,
        });
      } catch (err) {
        // JSON parse failed — treat as failure
        results.failed.push({
          custom_id: result.custom_id,
          error: "JSON parse failed",
          raw: text,
        });
      }
    } else {
      results.failed.push({
        custom_id: result.custom_id,
        error: result.result.error?.type || "unknown",
      });
    }
  }

  results.summary = {
    total: results.succeeded.length + results.failed.length,
    succeeded: results.succeeded.length,
    failed: results.failed.length,
    failure_rate:
      results.failed.length /
      (results.succeeded.length + results.failed.length),
  };

  // Log failed custom_ids for resubmission
  if (results.failed.length > 0) {
    console.log("Failed tickets (resubmit these):");
    results.failed.forEach((f) =>
      console.log(` - ${f.custom_id}: ${f.error}`)
    );
  }

  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
