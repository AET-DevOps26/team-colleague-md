export type SeedDomain = "users";

export interface SeedOptions {
  dryRun: boolean;
  only: SeedDomain[];
}

const SUPPORTED_DOMAINS: SeedDomain[] = ["users"];

export function parseSeedOptions(args: string[]): SeedOptions {
  let dryRun = false;
  let only: SeedDomain[] = [...SUPPORTED_DOMAINS];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--only") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Missing value for --only. Supported value: users.");
      }
      only = parseDomains(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--only=")) {
      only = parseDomains(arg.slice("--only=".length));
      continue;
    }

    throw new Error(`Unknown option "${arg}". Supported options: --dry-run, --only users.`);
  }

  return { dryRun, only };
}

function parseDomains(value: string): SeedDomain[] {
  const domains = value.split(",").map((domain) => domain.trim()).filter(Boolean);
  if (domains.length === 0) {
    throw new Error("Missing value for --only. Supported value: users.");
  }

  for (const domain of domains) {
    if (!SUPPORTED_DOMAINS.includes(domain as SeedDomain)) {
      throw new Error(`Unsupported seed domain "${domain}". Supported value: users.`);
    }
  }

  return [...new Set(domains)] as SeedDomain[];
}
