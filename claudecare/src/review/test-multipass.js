import { runMultiPassReview } from "./multiPassReview.js";

async function main() {
  console.log("Running 2-pass review of ClaudeCare agent layer...");
  console.log("Pass 1 reviews each file independently.");
  console.log("Pass 2 reviews cross-file integration.\n");

  const results = await runMultiPassReview();

  console.log("\n=== COMBINED FINDINGS ===");
  if (results.combined_findings.length === 0) {
    console.log("No findings. All agents pass local and integration review.");
  } else {
    results.combined_findings.forEach((f, i) => {
      console.log(`\n[${i + 1}] Pass ${f.pass} | ${f.scope.toUpperCase()}`);
      console.log(`  File(s): ${f.files_involved?.join(", ") || f.file}`);
      console.log(`  Severity: ${f.severity}`);
      console.log(`  Issue: ${f.issue}`);
    });
  }

  console.log(`\n=== SUMMARY ===`);
  const p1Count = results.pass1.reduce(
    (sum, r) => sum + r.local_issues.length,
    0
  );
  console.log(
    `Pass 1 (local): ${p1Count} issues across ${results.pass1.length} files`
  );
  console.log(
    `Pass 2 (integration): ${results.pass2.integration_issues.length} issues`
  );
  console.log(`Total: ${results.combined_findings.length} combined findings`);
  console.log(`Integration health: ${results.pass2.integration_health}`);
}

main().catch((err) => {
  console.error("Multi-pass review failed:", err);
});
