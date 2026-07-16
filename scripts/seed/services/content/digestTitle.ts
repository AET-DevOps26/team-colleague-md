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
  const digestDate = new Date(`${createdAt.slice(0, 10)}T12:00:00Z`);
  const formattedDate = TITLE_DATE_FORMATTER.format(digestDate);
  if (targetUsername === null) {
    return `Verita Community Digest — ${formattedDate}`;
  }

  const displayName = SEED_USERS.find((user) => user.username === targetUsername)?.displayName.trim();
  const fallbackTitle = `Your AI Digest — ${formattedDate}`;
  if (!displayName) {
    return fallbackTitle;
  }

  const personalTitle = `${displayName}’s AI Digest — ${formattedDate}`;
  return personalTitle.length <= MAX_DIGEST_TITLE_LENGTH ? personalTitle : fallbackTitle;
}
