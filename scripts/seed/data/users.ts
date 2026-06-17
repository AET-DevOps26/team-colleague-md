import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_SEED_PASSWORD = "Password123!";

export type SeedUserRole = "ADMIN" | "VERIFIED" | "USER";
export type SeedDigestFrequency = "DAILY" | "WEEKLY" | "FALSE";

export interface SeedUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarFile: string;
  bio: string | null;
  website: string | null;
  organisation: string | null;
  expertiseAreas: string[];
  role: SeedUserRole;
  isBanned: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  likeReceivedCount: number;
  createdAt: string;
  updatedAt: string;
  digestFrequency: SeedDigestFrequency;
  showBookmarks: boolean;
  showLikes: boolean;
}

const seedDataDir = path.dirname(fileURLToPath(import.meta.url));
export const AVATAR_ASSETS_DIR = path.resolve(seedDataDir, "../assets/avatars");

export const SEED_USERS: SeedUser[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    username: "alexchen",
    displayName: "Alex Chen",
    email: "alex@example.com",
    avatarFile: "alexchen.png",
    bio: "ML engineer building agents and RAG systems. Writing about practical AI implementation and the parts that do not make it into paper abstracts.",
    website: "https://alexchen.dev",
    organisation: null,
    expertiseAreas: ["Agents", "RAG", "Fine-tuning"],
    role: "ADMIN",
    isBanned: false,
    postCount: 12,
    followerCount: 342,
    followingCount: 89,
    likeReceivedCount: 1840,
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2025-05-10T08:00:00Z",
    digestFrequency: "WEEKLY",
    showBookmarks: true,
    showLikes: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    username: "sarahjkim",
    displayName: "Sarah Kim",
    email: "sarah.kim@example.com",
    avatarFile: "sarahjkim.png",
    bio: "Researcher at DeepMind working on mechanistic interpretability and alignment. I summarize papers so you do not have to.",
    website: null,
    organisation: "DeepMind",
    expertiseAreas: ["Interpretability", "Alignment", "Fine-tuning"],
    role: "VERIFIED",
    isBanned: false,
    postCount: 47,
    followerCount: 2100,
    followingCount: 183,
    likeReceivedCount: 8400,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2025-05-20T12:00:00Z",
    digestFrequency: "DAILY",
    showBookmarks: true,
    showLikes: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    username: "priya_ml",
    displayName: "Priya Nair",
    email: "priya.nair@example.com",
    avatarFile: "priya_ml.png",
    bio: "Open source ML at Hugging Face. Making large models accessible, with a soft spot for retrieval systems.",
    website: "https://priyanair.dev",
    organisation: "Hugging Face",
    expertiseAreas: ["RAG", "Open Source", "Multimodal"],
    role: "VERIFIED",
    isBanned: false,
    postCount: 31,
    followerCount: 1450,
    followingCount: 212,
    likeReceivedCount: 5200,
    createdAt: "2024-02-20T00:00:00Z",
    updatedAt: "2025-04-15T09:30:00Z",
    digestFrequency: "WEEKLY",
    showBookmarks: true,
    showLikes: false,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    username: "marcello_r",
    displayName: "Marcello Rossi",
    email: "marcello.rossi@example.com",
    avatarFile: "marcello_r.png",
    bio: "Building AI systems in production at a small team. Interested in the gap between research and engineering reality.",
    website: "https://marcellorossi.io",
    organisation: null,
    expertiseAreas: ["Agents", "LLMs"],
    role: "USER",
    isBanned: false,
    postCount: 8,
    followerCount: 127,
    followingCount: 45,
    likeReceivedCount: 654,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2025-03-28T14:00:00Z",
    digestFrequency: "WEEKLY",
    showBookmarks: false,
    showLikes: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    username: "tobiask",
    displayName: "Tobias Klein",
    email: "tobias.klein@example.com",
    avatarFile: "tobiask.png",
    bio: "Software engineer comparing model behavior on coding tasks, developer tools, and applied evaluation.",
    website: null,
    organisation: null,
    expertiseAreas: ["LLMs", "Evaluation", "Developer Tools"],
    role: "USER",
    isBanned: false,
    postCount: 15,
    followerCount: 388,
    followingCount: 96,
    likeReceivedCount: 2360,
    createdAt: "2024-04-18T08:15:00Z",
    updatedAt: "2025-02-11T16:45:00Z",
    digestFrequency: "FALSE",
    showBookmarks: true,
    showLikes: true,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    username: "ananya_roy",
    displayName: "Ananya Roy",
    email: "ananya.roy@example.com",
    avatarFile: "ananya_roy.png",
    bio: "Mechanistic interpretability researcher tracking circuits, in-context learning, and model internals.",
    website: null,
    organisation: "Anthropic",
    expertiseAreas: ["Mechanistic Interpretability", "Alignment", "LLMs"],
    role: "USER",
    isBanned: false,
    postCount: 22,
    followerCount: 980,
    followingCount: 141,
    likeReceivedCount: 4021,
    createdAt: "2024-05-04T11:20:00Z",
    updatedAt: "2025-05-08T10:10:00Z",
    digestFrequency: "DAILY",
    showBookmarks: true,
    showLikes: true,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    username: "helena_park",
    displayName: "Helena Park",
    email: "helena.park@example.com",
    avatarFile: "helena_park.png",
    bio: "Policy researcher focused on model evaluation, safety cases, and responsible deployment.",
    website: "https://helenapark.example.com",
    organisation: "AISI",
    expertiseAreas: ["AI Safety", "Policy", "Evaluation"],
    role: "USER",
    isBanned: false,
    postCount: 19,
    followerCount: 742,
    followingCount: 205,
    likeReceivedCount: 3188,
    createdAt: "2024-07-22T13:40:00Z",
    updatedAt: "2025-04-02T18:25:00Z",
    digestFrequency: "WEEKLY",
    showBookmarks: false,
    showLikes: false,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    username: "naomi_greene",
    displayName: "Naomi Greene",
    email: "naomi.greene@example.com",
    avatarFile: "naomi_greene.png",
    bio: "Applied scientist studying retrieval quality, long-context behavior, and evaluation design.",
    website: null,
    organisation: "DeepMind",
    expertiseAreas: ["RAG", "Evaluation", "Long Context"],
    role: "USER",
    isBanned: false,
    postCount: 26,
    followerCount: 1190,
    followingCount: 174,
    likeReceivedCount: 4760,
    createdAt: "2024-08-09T07:50:00Z",
    updatedAt: "2025-05-18T15:35:00Z",
    digestFrequency: "WEEKLY",
    showBookmarks: true,
    showLikes: false,
  },
];
