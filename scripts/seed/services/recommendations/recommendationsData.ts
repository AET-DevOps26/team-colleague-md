import { daysAgo, hoursAgo } from "../seedClock.ts";

export interface SeedTopicSubscription {
  id: string;
  userUsername: string;
  topicName: string;
  createdAt: string;
}

export interface SeedUserSubscription {
  id: string;
  followerUsername: string;
  followedUsername: string;
  createdAt: string;
}

export interface SeedInteraction {
  id: string;
  userUsername: string;
  postId: string;
  interactionType: "CLICK" | "VIEW" | "DWELL" | "SCROLL" | "SHARE";
  durationSeconds: number | null;
  scrollDepth: number | null;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface SeedNotification {
  id: string;
  userUsername: string;
  type: "COMMENT" | "LIKE" | "VERIFICATION_APPROVED" | "DAILY_DIGEST" | "NEW_POST_IN_SUBSCRIBED_TOPIC";
  content: string;
  relatedPostId: string | null;
  isRead: boolean;
  createdAt: string;
}

export const SEED_TOPIC_SUBSCRIPTIONS: SeedTopicSubscription[] = [
  topicSub("94000000-0000-4000-8000-000000000001", "alexchen", "large-language-models", daysAgo(9)),
  topicSub("94000000-0000-4000-8000-000000000002", "alexchen", "ai-agents", daysAgo(9)),
  topicSub("94000000-0000-4000-8000-000000000003", "alexchen", "retrieval-augmented-generation", daysAgo(9)),
  topicSub("94000000-0000-4000-8000-000000000004", "sarahjkim", "mechanistic-interpretability", daysAgo(9)),
  topicSub("94000000-0000-4000-8000-000000000005", "sarahjkim", "alignment", daysAgo(9)),
  topicSub("94000000-0000-4000-8000-000000000006", "priya_ml", "retrieval-augmented-generation", daysAgo(8)),
  topicSub("94000000-0000-4000-8000-000000000007", "priya_ml", "open-source", daysAgo(8)),
  topicSub("94000000-0000-4000-8000-000000000008", "tobiask", "inference-optimization", daysAgo(7)),
  topicSub("94000000-0000-4000-8000-000000000009", "helena_park", "model-evaluation", daysAgo(6)),
  topicSub("94000000-0000-4000-8000-000000000010", "naomi_greene", "retrieval-augmented-generation", daysAgo(5)),
];

export const SEED_USER_SUBSCRIPTIONS: SeedUserSubscription[] = [
  userSub("95000000-0000-4000-8000-000000000001", "alexchen", "sarahjkim", daysAgo(9)),
  userSub("95000000-0000-4000-8000-000000000002", "alexchen", "priya_ml", daysAgo(9)),
  userSub("95000000-0000-4000-8000-000000000003", "alexchen", "ananya_roy", daysAgo(9)),
  userSub("95000000-0000-4000-8000-000000000004", "sarahjkim", "ananya_roy", daysAgo(8)),
  userSub("95000000-0000-4000-8000-000000000005", "priya_ml", "alexchen", daysAgo(8)),
  userSub("95000000-0000-4000-8000-000000000006", "marcello_r", "tobiask", daysAgo(7)),
  userSub("95000000-0000-4000-8000-000000000007", "helena_park", "sarahjkim", daysAgo(6)),
  userSub("95000000-0000-4000-8000-000000000008", "naomi_greene", "priya_ml", daysAgo(5)),
];

export const SEED_INTERACTIONS: SeedInteraction[] = [
  interaction("96000000-0000-4000-8000-000000000001", "alexchen", "90000000-0000-4000-8000-000000000003", "VIEW", null, null, hoursAgo(10)),
  interaction("96000000-0000-4000-8000-000000000002", "alexchen", "90000000-0000-4000-8000-000000000003", "DWELL", 94, null, hoursAgo(10)),
  interaction("96000000-0000-4000-8000-000000000003", "alexchen", "90000000-0000-4000-8000-000000000014", "CLICK", null, null, hoursAgo(8)),
  interaction("96000000-0000-4000-8000-000000000004", "sarahjkim", "90000000-0000-4000-8000-000000000021", "VIEW", null, null, hoursAgo(5)),
  interaction("96000000-0000-4000-8000-000000000005", "sarahjkim", "90000000-0000-4000-8000-000000000021", "SCROLL", null, 88, hoursAgo(5)),
  interaction("96000000-0000-4000-8000-000000000006", "priya_ml", "90000000-0000-4000-8000-000000000010", "VIEW", null, null, daysAgo(1)),
  interaction("96000000-0000-4000-8000-000000000007", "priya_ml", "90000000-0000-4000-8000-000000000010", "SHARE", null, null, daysAgo(1)),
  interaction("96000000-0000-4000-8000-000000000008", "marcello_r", "90000000-0000-4000-8000-000000000018", "DWELL", 71, null, hoursAgo(10)),
  interaction("96000000-0000-4000-8000-000000000009", "tobiask", "90000000-0000-4000-8000-000000000014", "VIEW", null, null, hoursAgo(8)),
  interaction("96000000-0000-4000-8000-000000000010", "helena_park", "90000000-0000-4000-8000-000000000016", "VIEW", null, null, daysAgo(6)),
  interaction("96000000-0000-4000-8000-000000000011", "ananya_roy", "90000000-0000-4000-8000-000000000021", "DWELL", 132, null, hoursAgo(5)),
  interaction("96000000-0000-4000-8000-000000000012", "naomi_greene", "90000000-0000-4000-8000-000000000009", "SCROLL", null, 76, hoursAgo(6)),
];

export const SEED_NOTIFICATIONS: SeedNotification[] = [
  notification("97000000-0000-4000-8000-000000000001", "alexchen", "LIKE", "Naomi Greene liked your post on structured outputs.", "90000000-0000-4000-8000-000000000009", false, hoursAgo(5)),
  notification("97000000-0000-4000-8000-000000000002", "alexchen", "COMMENT", "Naomi Greene commented on your post.", "90000000-0000-4000-8000-000000000009", false, hoursAgo(5)),
  notification("97000000-0000-4000-8000-000000000003", "alexchen", "NEW_POST_IN_SUBSCRIBED_TOPIC", "Priya Nair published a new RAG post.", "90000000-0000-4000-8000-000000000003", true, hoursAgo(10)),
  notification("97000000-0000-4000-8000-000000000004", "alexchen", "DAILY_DIGEST", "Your AI digest is ready.", null, false, hoursAgo(6)),
  notification("97000000-0000-4000-8000-000000000005", "sarahjkim", "LIKE", "Alex Chen liked a mechanistic interpretability post.", "90000000-0000-4000-8000-000000000021", false, hoursAgo(4.5)),
  notification("97000000-0000-4000-8000-000000000006", "priya_ml", "NEW_POST_IN_SUBSCRIBED_TOPIC", "Alex Chen published a new RAG evaluation post.", "90000000-0000-4000-8000-000000000010", true, daysAgo(1)),
  notification("97000000-0000-4000-8000-000000000007", "tobiask", "COMMENT", "Marcello Rossi commented on speculative decoding.", "90000000-0000-4000-8000-000000000018", false, hoursAgo(10)),
];

function topicSub(id: string, userUsername: string, topicName: string, createdAt: string): SeedTopicSubscription {
  return { id, userUsername, topicName, createdAt };
}

function userSub(id: string, followerUsername: string, followedUsername: string, createdAt: string): SeedUserSubscription {
  return { id, followerUsername, followedUsername, createdAt };
}

function interaction(
  id: string,
  userUsername: string,
  postId: string,
  interactionType: SeedInteraction["interactionType"],
  durationSeconds: number | null,
  scrollDepth: number | null,
  createdAt: string,
): SeedInteraction {
  return {
    id,
    userUsername,
    postId,
    interactionType,
    durationSeconds,
    scrollDepth,
    metadata: { source: "seed", surface: "local-dev" },
    createdAt,
  };
}

function notification(
  id: string,
  userUsername: string,
  type: SeedNotification["type"],
  content: string,
  relatedPostId: string | null,
  isRead: boolean,
  createdAt: string,
): SeedNotification {
  return { id, userUsername, type, content, relatedPostId, isRead, createdAt };
}
