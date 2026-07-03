import { parseSeedOptions } from "./seed/cli.ts";
import { getSeedConfig } from "./seed/config.ts";
import { resetSeed } from "./seed/reset.ts";
import { seedContent } from "./seed/services/content/seedContent.ts";
import { seedRecommendations } from "./seed/services/recommendations/seedRecommendations.ts";
import { seedUsers } from "./seed/services/users/seedUsers.ts";

async function main() {
  const options = parseSeedOptions(process.argv.slice(2));
  const config = getSeedConfig(process.env);

  console.log(`Verita local seed (${options.dryRun ? "dry run" : "write mode"})`);
  console.log(`Domains: ${options.only.join(", ")}`);

  // Purge stale seed rows before re-inserting so removed fixtures don't linger.
  if (options.reset) {
    await resetSeed(config, options);
  }

  if (options.only.includes("users")) {
    await seedUsers(config, options);
  }
  if (options.only.includes("content")) {
    await seedContent(config, options, {
      usersPlannedInCurrentDryRun: options.dryRun && options.only.includes("users"),
    });
  }
  if (options.only.includes("recommendations")) {
    await seedRecommendations(config, options, {
      usersPlannedInCurrentDryRun: options.dryRun && options.only.includes("users"),
      contentPlannedInCurrentDryRun: options.dryRun && options.only.includes("content"),
    });
  }

  console.log(options.dryRun ? "Dry run completed." : "Seed completed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
