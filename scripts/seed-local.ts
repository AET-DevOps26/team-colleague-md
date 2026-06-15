import { parseSeedOptions } from "./seed/cli.ts";
import { getSeedConfig } from "./seed/config.ts";
import { seedUsers } from "./seed/users/seedUsers.ts";

async function main() {
  const options = parseSeedOptions(process.argv.slice(2));
  const config = getSeedConfig(process.env);

  console.log(`Verita local seed (${options.dryRun ? "dry run" : "write mode"})`);
  console.log(`Domains: ${options.only.join(", ")}`);

  if (options.only.includes("users")) {
    await seedUsers(config, options);
  }

  console.log(options.dryRun ? "Dry run completed." : "Seed completed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
