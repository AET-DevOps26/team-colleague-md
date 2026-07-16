import { SEED_USERS } from "../users/usersData.ts";

const MAX_DIGEST_TITLE_LENGTH = 200;
const TITLE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Builds the deterministic title stored for a seeded personal or public digest. */
export function seedDigestTitle(targetUsername: string | null, createdAt: string): string {
  const displayName =
    targetUsername === null
      ? null
      : (SEED_USERS.find((user) => user.username === targetUsername)?.displayName ?? null);
  return buildSeedDigestTitle(displayName, createdAt, targetUsername === null);
}

/** Applies the persisted digest-title rules to resolved seed-user data. */
export function buildSeedDigestTitle(
  displayName: string | null,
  createdAt: string,
  publicDigest: boolean,
): string {
  const digestDate = new Date(`${createdAt.slice(0, 10)}T12:00:00Z`);
  const formattedDate = TITLE_DATE_FORMATTER.format(digestDate);
  if (publicDigest) {
    return `Verita Community Digest — ${formattedDate}`;
  }

  const trimmedDisplayName = displayName?.trim();
  const fallbackTitle = `Your AI Digest — ${formattedDate}`;
  if (!trimmedDisplayName) {
    return fallbackTitle;
  }

  const personalTitle = `${trimmedDisplayName}’s AI Digest — ${formattedDate}`;
  return Array.from(personalTitle).length <= MAX_DIGEST_TITLE_LENGTH ? personalTitle : fallbackTitle;
}
