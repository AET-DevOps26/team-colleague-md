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
  topicSub("94000000-0000-4000-8000-000000000001", "alexchen", "large-language-models", "2026-06-01T09:00:00Z"),
  topicSub("94000000-0000-4000-8000-000000000002", "alexchen", "ai-agents", "2026-06-01T09:01:00Z"),
  topicSub("94000000-0000-4000-8000-000000000003", "alexchen", "retrieval-augmented-generation", "2026-06-01T09:02:00Z"),
  topicSub("94000000-0000-4000-8000-000000000004", "sarahjkim", "mechanistic-interpretability", "2026-06-01T10:00:00Z"),
  topicSub("94000000-0000-4000-8000-000000000005", "sarahjkim", "alignment", "2026-06-01T10:01:00Z"),
  topicSub("94000000-0000-4000-8000-000000000006", "priya_ml", "retrieval-augmented-generation", "2026-06-02T08:00:00Z"),
  topicSub("94000000-0000-4000-8000-000000000007", "priya_ml", "open-source", "2026-06-02T08:01:00Z"),
  topicSub("94000000-0000-4000-8000-000000000008", "tobiask", "inference-optimization", "2026-06-03T11:00:00Z"),
  topicSub("94000000-0000-4000-8000-000000000009", "helena_park", "model-evaluation", "2026-06-04T12:00:00Z"),
  topicSub("94000000-0000-4000-8000-000000000010", "naomi_greene", "retrieval-augmented-generation", "2026-06-05T13:00:00Z"),
];

export const SEED_USER_SUBSCRIPTIONS: SeedUserSubscription[] = [
  userSub("95000000-0000-4000-8000-000000000001", "alexchen", "sarahjkim", "2026-06-01T09:10:00Z"),
  userSub("95000000-0000-4000-8000-000000000002", "alexchen", "priya_ml", "2026-06-01T09:11:00Z"),
  userSub("95000000-0000-4000-8000-000000000003", "alexchen", "ananya_roy", "2026-06-01T09:12:00Z"),
  userSub("95000000-0000-4000-8000-000000000004", "sarahjkim", "ananya_roy", "2026-06-02T10:00:00Z"),
  userSub("95000000-0000-4000-8000-000000000005", "priya_ml", "alexchen", "2026-06-02T11:00:00Z"),
  userSub("95000000-0000-4000-8000-000000000006", "marcello_r", "tobiask", "2026-06-03T12:00:00Z"),
  userSub("95000000-0000-4000-8000-000000000007", "helena_park", "sarahjkim", "2026-06-04T13:00:00Z"),
  userSub("95000000-0000-4000-8000-000000000008", "naomi_greene", "priya_ml", "2026-06-05T14:00:00Z"),
];

export const SEED_INTERACTIONS: SeedInteraction[] = [
  interaction("96000000-0000-4000-8000-000000000001", "alexchen", "90000000-0000-4000-8000-000000000003", "VIEW", null, null, "2026-06-10T02:00:00Z"),
  interaction("96000000-0000-4000-8000-000000000002", "alexchen", "90000000-0000-4000-8000-000000000003", "DWELL", 94, null, "2026-06-10T02:03:00Z"),
  interaction("96000000-0000-4000-8000-000000000003", "alexchen", "90000000-0000-4000-8000-000000000014", "CLICK", null, null, "2026-06-10T07:20:00Z"),
  interaction("96000000-0000-4000-8000-000000000004", "sarahjkim", "90000000-0000-4000-8000-000000000021", "VIEW", null, null, "2026-06-10T09:00:00Z"),
  interaction("96000000-0000-4000-8000-000000000005", "sarahjkim", "90000000-0000-4000-8000-000000000021", "SCROLL", null, 88, "2026-06-10T09:04:00Z"),
  interaction("96000000-0000-4000-8000-000000000006", "priya_ml", "90000000-0000-4000-8000-000000000010", "VIEW", null, null, "2026-06-09T18:05:00Z"),
  interaction("96000000-0000-4000-8000-000000000007", "priya_ml", "90000000-0000-4000-8000-000000000010", "SHARE", null, null, "2026-06-09T18:15:00Z"),
  interaction("96000000-0000-4000-8000-000000000008", "marcello_r", "90000000-0000-4000-8000-000000000018", "DWELL", 71, null, "2026-06-10T04:10:00Z"),
  interaction("96000000-0000-4000-8000-000000000009", "tobiask", "90000000-0000-4000-8000-000000000014", "VIEW", null, null, "2026-06-10T07:00:00Z"),
  interaction("96000000-0000-4000-8000-000000000010", "helena_park", "90000000-0000-4000-8000-000000000016", "VIEW", null, null, "2026-06-05T12:30:00Z"),
  interaction("96000000-0000-4000-8000-000000000011", "ananya_roy", "90000000-0000-4000-8000-000000000021", "DWELL", 132, null, "2026-06-10T08:20:00Z"),
  interaction("96000000-0000-4000-8000-000000000012", "naomi_greene", "90000000-0000-4000-8000-000000000009", "SCROLL", null, 76, "2026-06-10T09:12:00Z"),
];

export const SEED_NOTIFICATIONS: SeedNotification[] = [
  notification("97000000-0000-4000-8000-000000000001", "alexchen", "LIKE", "Naomi Greene liked your post on structured outputs.", "90000000-0000-4000-8000-000000000009", false, "2026-06-10T09:15:00Z"),
  notification("97000000-0000-4000-8000-000000000002", "alexchen", "COMMENT", "Naomi Greene commented on your post.", "90000000-0000-4000-8000-000000000009", false, "2026-06-10T09:20:00Z"),
  notification("97000000-0000-4000-8000-000000000003", "alexchen", "NEW_POST_IN_SUBSCRIBED_TOPIC", "Priya Nair published a new RAG post.", "90000000-0000-4000-8000-000000000003", true, "2026-06-10T02:00:00Z"),
  notification("97000000-0000-4000-8000-000000000004", "alexchen", "DAILY_DIGEST", "Your AI digest is ready.", null, false, "2026-06-10T06:00:00Z"),
  notification("97000000-0000-4000-8000-000000000005", "sarahjkim", "LIKE", "Alex Chen liked a mechanistic interpretability post.", "90000000-0000-4000-8000-000000000021", false, "2026-06-10T08:30:00Z"),
  notification("97000000-0000-4000-8000-000000000006", "priya_ml", "NEW_POST_IN_SUBSCRIBED_TOPIC", "Alex Chen published a new RAG evaluation post.", "90000000-0000-4000-8000-000000000010", true, "2026-06-09T18:20:00Z"),
  notification("97000000-0000-4000-8000-000000000007", "tobiask", "COMMENT", "Marcello Rossi commented on speculative decoding.", "90000000-0000-4000-8000-000000000018", false, "2026-06-10T04:30:00Z"),
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
