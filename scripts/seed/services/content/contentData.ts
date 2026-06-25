import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_USERS } from "../users/usersData.ts";

export const SEED_REFERENCE_TIME = "2026-06-10T12:00:00Z";
const contentDataDir = path.dirname(fileURLToPath(import.meta.url));
export const POST_COVER_ASSETS_DIR = path.resolve(contentDataDir, "../../assets/post-covers");

export interface SeedTopic {
  name: string;
  displayName: string;
  categoryId: string;
  sortOrder: number;
}

export interface SeedPost {
  id: string;
  authorUsername: string;
  title: string;
  excerpt: string;
  content: string;
  contentSummary: string;
  sourceUrls: string[];
  topicNames: string[];
  viewCount: number;
  coverImageFile: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeedComment {
  id: string;
  postId: string;
  authorUsername: string;
  parentCommentId: string | null;
  text: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeedUserPostLink {
  id: string;
  userUsername: string;
  postId: string;
  createdAt: string;
}

export interface SeedVote extends SeedUserPostLink {
  voteType: "UPVOTE";
}

export const SEED_TOPICS: SeedTopic[] = [
  { name: "large-language-models", displayName: "LLMs", categoryId: "models", sortOrder: 1 },
  { name: "ai-agents", displayName: "Agents", categoryId: "applications", sortOrder: 3 },
  { name: "fine-tuning", displayName: "Fine-Tuning", categoryId: "models", sortOrder: 3 },
  { name: "retrieval-augmented-generation", displayName: "RAG", categoryId: "engineering", sortOrder: 5 },
  { name: "multimodal-ai", displayName: "Multimodal", categoryId: "research", sortOrder: 5 },
  { name: "open-source", displayName: "Open Source", categoryId: "engineering", sortOrder: 6 },
  { name: "model-evaluation", displayName: "Model Evaluation", categoryId: "models", sortOrder: 4 },
  { name: "mechanistic-interpretability", displayName: "Mechanistic Interpretability", categoryId: "research", sortOrder: 6 },
  { name: "alignment", displayName: "Alignment", categoryId: "research", sortOrder: 7 },
  { name: "in-context-learning", displayName: "In-Context Learning", categoryId: "research", sortOrder: 8 },
];

export const SEED_POSTS: SeedPost[] = [
  post("90000000-0000-4000-8000-000000000001", "sarahjkim", "How I fine-tuned Llama 3 on 4 GPUs in under 6 hours", "A practical walkthrough of QLoRA fine-tuning with Flash Attention 2, gradient checkpointing, and a few tricks that cut my training time by 40%.", ["fine-tuning", "open-source"], 8920, "2026-06-10T10:00:00Z"),
  post("90000000-0000-4000-8000-000000000002", "marcello_r", "Building a research agent that actually works in production", "After six months running autonomous agents in production, here is what I learned about tool design, failure modes, and keeping humans in the loop.", ["ai-agents", "large-language-models"], 5410, "2026-06-10T07:00:00Z"),
  post("90000000-0000-4000-8000-000000000003", "priya_ml", "RAG is not dead - it just needs better chunking", "Naive fixed-size chunking kills retrieval quality. This post covers semantic chunking, late chunking, and ColBERT-style multi-vector retrieval.", ["retrieval-augmented-generation", "large-language-models"], 12300, "2026-06-10T00:00:00Z", "rag-evaluation.png"),
  post("90000000-0000-4000-8000-000000000004", "tobiask", "GPT-4o vs Claude 3.5 Sonnet on code generation - a fair comparison", "I ran 200 coding tasks across both models with identical prompts and scoring criteria. The results surprised me.", ["large-language-models", "model-evaluation"], 18700, "2026-06-09T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000005", "sarahjkim", "Vision-language models for medical imaging: where we are in 2025", "A survey of multimodal models applied to radiology, pathology, and ophthalmology - with honest assessments of clinical readiness.", ["multimodal-ai", "large-language-models"], 6800, "2026-06-09T06:00:00Z"),
  post("90000000-0000-4000-8000-000000000006", "marcello_r", "Mixtral MoE: understanding sparse expert routing", "Mixture-of-experts routing is elegant but non-obvious. This post builds intuition from first principles and explores why Mixtral uses top-2 routing.", ["large-language-models", "open-source"], 9200, "2026-06-08T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000007", "priya_ml", "Prompt caching in Claude API - a practical guide", "Cache prefixes can cut latency by 85% and costs by 90% for repeated context. Here is exactly how to structure prompts to maximise cache hits.", ["large-language-models"], 7100, "2026-06-08T00:00:00Z"),
  post("90000000-0000-4000-8000-000000000008", "tobiask", "Why your agentic pipeline keeps hallucinating tool calls", "Three root causes I have found across dozens of agent systems: ambiguous schemas, missing examples, and token budget pressure near context limits.", ["ai-agents", "large-language-models"], 11500, "2026-06-07T12:00:00Z", "agent-tooling.png"),
  post("90000000-0000-4000-8000-000000000009", "alexchen", "Structured outputs are the most underrated feature in the OpenAI API", "Constrained decoding lets you guarantee valid JSON every time. Here is how I replaced most output parsing code with a single schema definition.", ["large-language-models", "ai-agents"], 7400, "2026-06-10T08:00:00Z"),
  post("90000000-0000-4000-8000-000000000010", "alexchen", "I ran the same RAG eval on five chunking strategies. Here is what actually mattered.", "Fixed-size, sentence, semantic, late, and proposition chunking - benchmarked across three domains. The winner is not what I expected.", ["retrieval-augmented-generation", "large-language-models"], 14200, "2026-06-09T18:00:00Z"),
  post("90000000-0000-4000-8000-000000000011", "alexchen", "Tool use patterns that survive production: a field guide", "After 18 months running tool-using agents in production, here are the patterns that held up, the ones that failed, and why the difference matters.", ["ai-agents", "large-language-models"], 9800, "2026-06-07T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000012", "alexchen", "Fine-tuning on 4 consumer GPUs: a no-nonsense QLoRA guide for 2025", "Flash Attention, paged optimisers, and gradient checkpointing together let you fine-tune useful models on modest hardware.", ["fine-tuning", "open-source"], 21600, "2026-06-04T12:00:00Z", "fine-tuning.png"),
  post("90000000-0000-4000-8000-000000000013", "alexchen", "Context window size is a red herring", "Everyone is racing to larger contexts. Most applications only need the right 2,000 tokens - not all of them.", ["large-language-models", "retrieval-augmented-generation"], 12900, "2026-05-31T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000014", "helena_park", "LLM evaluation is broken - and here is how to fix it", "Most eval suites measure what is easy to measure, not what matters. Here is a framework for production systems.", ["large-language-models", "model-evaluation"], 15800, "2026-06-10T06:00:00Z", "model-evaluation.png"),
  post("90000000-0000-4000-8000-000000000015", "helena_park", "Prompt reliability at scale: what breaks when you have 10M calls per day", "Small phrasing changes cause output variance at scale. These are the prompt patterns that hold up under distribution shift.", ["large-language-models", "ai-agents"], 10200, "2026-06-08T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000016", "helena_park", "From research to product: the alignment tax is real", "Moving a fine-tuned model from benchmark-topping to actually deployed costs more than expected.", ["fine-tuning", "alignment"], 22400, "2026-06-05T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000017", "helena_park", "Multi-agent evals: how do you test something that is partly non-deterministic?", "Agent outputs are long, ground truth is fuzzy, and the system is stateful. This is the evaluation framework that finally worked.", ["ai-agents", "model-evaluation"], 8700, "2026-06-02T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000018", "tobiask", "Speculative decoding in production: the numbers nobody tells you", "Draft model acceptance rate drops sharply with longer prompts, and the memory overhead is non-trivial.", ["large-language-models", "inference-optimization"], 13600, "2026-06-10T03:00:00Z", "inference-optimization.png"),
  post("90000000-0000-4000-8000-000000000019", "tobiask", "KV cache is your biggest cost - here is how to shrink it", "At 10K concurrent users, KV cache dominates GPU memory. Multi-query attention, grouped-query attention, and prefix sharing explained.", ["large-language-models", "retrieval-augmented-generation"], 9100, "2026-06-07T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000020", "tobiask", "MLOps for LLMs: what changed in 2025", "vLLM, SGLang, and TensorRT-LLM matured quickly. Here is an honest comparison for teams choosing an inference stack.", ["open-source", "large-language-models"], 6800, "2026-06-03T12:00:00Z"),
  post("90000000-0000-4000-8000-000000000021", "ananya_roy", "Skill Induction Heads: mechanistic evidence for few-shot learning in 70B models", "We isolate attention heads that implement in-context learning in large models and show that ablating them collapses few-shot accuracy.", ["mechanistic-interpretability", "alignment", "in-context-learning"], 18402, "2026-06-10T08:00:00Z", "mechanistic-interpretability.png"),
];

export const SEED_COMMENTS: SeedComment[] = [
  comment("91000000-0000-4000-8000-000000000001", "90000000-0000-4000-8000-000000000021", "sarahjkim", null, "This is great. The most interesting part for me is the skill-induction-only-above-30B finding. It lines up with what we see in interpretability probes: some capabilities arrive as bundled circuits rather than smooth scaling curves.", 5, "2026-06-10T09:00:00Z"),
  comment("91000000-0000-4000-8000-000000000002", "90000000-0000-4000-8000-000000000021", "ananya_roy", "91000000-0000-4000-8000-000000000001", "We ran the same probe on three instruction-tuned checkpoints. Most heads survive, but the format sub-population gets sharper after alignment tuning.", 3, "2026-06-10T10:00:00Z"),
  comment("91000000-0000-4000-8000-000000000003", "90000000-0000-4000-8000-000000000021", "marcello_r", "91000000-0000-4000-8000-000000000001", "Also curious about cross-family transfer. If the residual signature survives tokenizer differences, this becomes much easier to operationalize.", 2, "2026-06-10T10:30:00Z"),
  comment("91000000-0000-4000-8000-000000000004", "90000000-0000-4000-8000-000000000021", "helena_park", null, "Ablation is useful evidence of necessity, but not always mechanism. Have you tried activation patching from shuffled-demo runs into coherent-demo runs?", 4, "2026-06-10T10:15:00Z"),
  comment("91000000-0000-4000-8000-000000000005", "90000000-0000-4000-8000-000000000021", "tobiask", null, "Reproduced a smaller version on an instruct checkpoint. The effect is real, though less dramatic after instruction tuning.", 2, "2026-06-10T11:00:00Z"),
  comment("91000000-0000-4000-8000-000000000006", "90000000-0000-4000-8000-000000000003", "alexchen", null, "The late-chunking result matches what I have seen in support search. It helps most when source documents mix procedures and explanations.", 2, "2026-06-10T02:00:00Z"),
  comment("91000000-0000-4000-8000-000000000007", "90000000-0000-4000-8000-000000000014", "priya_ml", null, "I like the separation between benchmark evals and deployment evals. That distinction gets lost in most dashboards.", 3, "2026-06-10T07:30:00Z"),
  comment("91000000-0000-4000-8000-000000000008", "90000000-0000-4000-8000-000000000018", "marcello_r", null, "The acceptance-rate cliff with longer prompts is the part people underestimate. It changes the economics quickly.", 1, "2026-06-10T04:30:00Z"),
  comment("91000000-0000-4000-8000-000000000009", "90000000-0000-4000-8000-000000000009", "naomi_greene", null, "Schema-first generation is also a product-design constraint. The model behaves better when the interface is explicit.", 2, "2026-06-10T09:20:00Z"),
];

export const SEED_BOOKMARKS: SeedUserPostLink[] = [
  link("93000000-0000-4000-8000-000000000001", "alexchen", "90000000-0000-4000-8000-000000000003", "2026-06-10T02:10:00Z"),
  link("93000000-0000-4000-8000-000000000002", "alexchen", "90000000-0000-4000-8000-000000000014", "2026-06-10T07:40:00Z"),
  link("93000000-0000-4000-8000-000000000003", "sarahjkim", "90000000-0000-4000-8000-000000000021", "2026-06-10T09:05:00Z"),
  link("93000000-0000-4000-8000-000000000004", "priya_ml", "90000000-0000-4000-8000-000000000010", "2026-06-09T18:30:00Z"),
  link("93000000-0000-4000-8000-000000000005", "tobiask", "90000000-0000-4000-8000-000000000018", "2026-06-10T04:00:00Z"),
  link("93000000-0000-4000-8000-000000000006", "helena_park", "90000000-0000-4000-8000-000000000016", "2026-06-05T13:00:00Z"),
];

export const SEED_VOTES: SeedVote[] = [
  vote("92000000-0000-4000-8000-000000000001", "alexchen", "90000000-0000-4000-8000-000000000003", "2026-06-10T02:05:00Z"),
  vote("92000000-0000-4000-8000-000000000002", "sarahjkim", "90000000-0000-4000-8000-000000000021", "2026-06-10T09:03:00Z"),
  vote("92000000-0000-4000-8000-000000000003", "priya_ml", "90000000-0000-4000-8000-000000000010", "2026-06-09T18:10:00Z"),
  vote("92000000-0000-4000-8000-000000000004", "marcello_r", "90000000-0000-4000-8000-000000000018", "2026-06-10T04:10:00Z"),
  vote("92000000-0000-4000-8000-000000000005", "tobiask", "90000000-0000-4000-8000-000000000014", "2026-06-10T07:10:00Z"),
  vote("92000000-0000-4000-8000-000000000006", "ananya_roy", "90000000-0000-4000-8000-000000000021", "2026-06-10T08:20:00Z"),
  vote("92000000-0000-4000-8000-000000000007", "helena_park", "90000000-0000-4000-8000-000000000016", "2026-06-05T13:10:00Z"),
  vote("92000000-0000-4000-8000-000000000008", "naomi_greene", "90000000-0000-4000-8000-000000000009", "2026-06-10T09:10:00Z"),
  vote("92000000-0000-4000-8000-000000000009", "alexchen", "90000000-0000-4000-8000-000000000021", "2026-06-10T08:30:00Z"),
  vote("92000000-0000-4000-8000-000000000010", "priya_ml", "90000000-0000-4000-8000-000000000021", "2026-06-10T08:45:00Z"),
  vote("92000000-0000-4000-8000-000000000011", "sarahjkim", "90000000-0000-4000-8000-000000000014", "2026-06-10T07:20:00Z"),
  vote("92000000-0000-4000-8000-000000000012", "marcello_r", "90000000-0000-4000-8000-000000000011", "2026-06-07T13:00:00Z"),
];

export function seedUserId(username: string): string {
  const user = SEED_USERS.find((candidate) => candidate.username === username);
  if (!user) {
    throw new Error(`Unknown seeded user "${username}".`);
  }
  return user.id;
}

function post(
  id: string,
  authorUsername: string,
  title: string,
  excerpt: string,
  topicNames: string[],
  viewCount: number,
  createdAt: string,
  coverImageFile: string | null = null,
): SeedPost {
  const content = `${excerpt}\n\n${title} is a practical note from the Verita community. It focuses on what changed, what held up in real systems, and what teams should measure before adopting the pattern.\n\nThe main lesson is to keep the interface explicit, test the system under realistic load, and compare improvements against a simple baseline. These details matter more than headline benchmark numbers when the work reaches production.`;
  return {
    id,
    authorUsername,
    title,
    excerpt,
    content,
    contentSummary: excerpt,
    sourceUrls: [
      `https://example.com/verita/sources/${id.slice(-3)}`,
      `https://github.com/verita-labs/research-notes/${id.slice(-3)}`,
    ],
    topicNames,
    viewCount,
    coverImageFile,
    createdAt,
    updatedAt: createdAt,
  };
}

function comment(id: string, postId: string, authorUsername: string, parentCommentId: string | null, text: string, likeCount: number, createdAt: string): SeedComment {
  return { id, postId, authorUsername, parentCommentId, text, likeCount, createdAt, updatedAt: createdAt };
}

function link(id: string, userUsername: string, postId: string, createdAt: string): SeedUserPostLink {
  return { id, userUsername, postId, createdAt };
}

function vote(id: string, userUsername: string, postId: string, createdAt: string): SeedVote {
  return { ...link(id, userUsername, postId, createdAt), voteType: "UPVOTE" };
}
