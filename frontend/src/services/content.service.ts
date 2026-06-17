import type { Comment, FeedPage, Post, PostDetail, DigestListItem, TopicCategory, TodayDigest } from '../types';

const MOCK_TOPICS = [
  { id: 't1', name: 'LLMs' },
  { id: 't2', name: 'Agents' },
  { id: 't3', name: 'Fine-tuning' },
  { id: 't4', name: 'RAG' },
  { id: 't5', name: 'Multimodal' },
  { id: 't6', name: 'Open Source' },
];

const MOCK_AUTHORS = [
  { id: 'u1', username: 'sarahjkim', displayName: 'Sarah Kim', role: 'VERIFIED' as const, organisation: 'DeepMind' },
  { id: 'u2', username: 'marcello_r', displayName: 'Marcello Rossi', role: 'USER' as const },
  { id: 'u3', username: 'priya_ml', displayName: 'Priya Nair', role: 'VERIFIED' as const, organisation: 'Hugging Face' },
  { id: 'u4', username: 'tobiask', displayName: 'Tobias Klein', role: 'USER' as const },
  { id: 'user-1', username: 'alexchen', displayName: 'Alex Chen', role: 'USER' as const },
  { id: 'demo-alice', username: 'alice_verita', displayName: 'Alice Morgan', role: 'VERIFIED' as const, organisation: 'Verita Labs' },
  { id: 'demo-bob', username: 'bob_verita', displayName: 'Bob Nakamura', role: 'USER' as const, organisation: 'CloudMind AI' },
];

const BASE_POSTS: Post[] = [
  {
    id: 'p1',
    title: 'How I fine-tuned Llama 3 on 4 GPUs in under 6 hours',
    excerpt: 'A practical walkthrough of QLoRA fine-tuning with Flash Attention 2, gradient checkpointing, and a few tricks that cut my training time by 40%.',
    coverImageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
    author: MOCK_AUTHORS[0],
    topics: [MOCK_TOPICS[2], MOCK_TOPICS[5]],
    likeCount: 312,
    commentCount: 47,
    viewCount: 8920,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    readTimeMinutes: 6,
  },
  {
    id: 'p2',
    title: 'Building a research agent that actually works in production',
    excerpt: 'After six months running autonomous agents in production, here is what I learned about tool design, failure modes, and keeping humans in the loop.',
    author: MOCK_AUTHORS[1],
    topics: [MOCK_TOPICS[1], MOCK_TOPICS[0]],
    likeCount: 198,
    commentCount: 31,
    viewCount: 5410,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p3',
    title: 'RAG is not dead — it just needs better chunking',
    excerpt: 'Naive fixed-size chunking kills retrieval quality. This post covers semantic chunking, late chunking, and ColBERT-style multi-vector retrieval.',
    coverImageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80',
    author: MOCK_AUTHORS[2],
    topics: [MOCK_TOPICS[3], MOCK_TOPICS[0]],
    likeCount: 445,
    commentCount: 62,
    viewCount: 12300,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    readTimeMinutes: 11,
  },
  {
    id: 'p4',
    title: 'GPT-4o vs Claude 3.5 Sonnet on code generation — a fair comparison',
    excerpt: 'I ran 200 coding tasks across both models with identical prompts and scoring criteria. The results surprised me.',
    author: MOCK_AUTHORS[3],
    topics: [MOCK_TOPICS[0]],
    likeCount: 567,
    commentCount: 89,
    viewCount: 18700,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p5',
    title: 'Vision-language models for medical imaging: where we are in 2025',
    excerpt: 'A survey of multimodal models applied to radiology, pathology, and ophthalmology — with honest assessments of clinical readiness.',
    coverImageUrl: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&q=80',
    author: MOCK_AUTHORS[0],
    topics: [MOCK_TOPICS[4], MOCK_TOPICS[0]],
    likeCount: 231,
    commentCount: 28,
    viewCount: 6800,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    readTimeMinutes: 14,
  },
  {
    id: 'p6',
    title: 'Mixtral MoE: understanding sparse expert routing',
    excerpt: 'Mixture-of-experts routing is elegant but non-obvious. This post builds intuition from first principles and explores why Mixtral uses top-2 routing.',
    author: MOCK_AUTHORS[1],
    topics: [MOCK_TOPICS[0], MOCK_TOPICS[5]],
    likeCount: 389,
    commentCount: 54,
    viewCount: 9200,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p7',
    title: 'Prompt caching in Claude API — a practical guide',
    excerpt: 'Cache prefixes can cut latency by 85% and costs by 90% for repeated context. Here is exactly how to structure prompts to maximise cache hits.',
    author: MOCK_AUTHORS[2],
    topics: [MOCK_TOPICS[0]],
    likeCount: 276,
    commentCount: 19,
    viewCount: 7100,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p8',
    title: 'Why your agentic pipeline keeps hallucinating tool calls',
    excerpt: 'Three root causes I have found across dozens of agent systems: ambiguous schemas, missing examples, and token budget pressure near context limits.',
    coverImageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    author: MOCK_AUTHORS[3],
    topics: [MOCK_TOPICS[1], MOCK_TOPICS[0]],
    likeCount: 412,
    commentCount: 73,
    viewCount: 11500,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    readTimeMinutes: 9,
  },
  // Alex Chen's posts
  {
    id: 'p-ac1',
    title: 'Structured outputs are the most underrated feature in the OpenAI API',
    excerpt: 'Constrained decoding lets you guarantee valid JSON every time. Here is how I replaced 80% of my output parsing code with a single schema definition.',
    coverImageUrl: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80',
    author: MOCK_AUTHORS[4],
    topics: [MOCK_TOPICS[0], MOCK_TOPICS[1]],
    likeCount: 284,
    commentCount: 38,
    viewCount: 7400,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    readTimeMinutes: 7,
  },
  {
    id: 'p-ac2',
    title: 'I ran the same RAG eval on five chunking strategies. Here is what actually mattered.',
    excerpt: 'Fixed-size, sentence, semantic, late, and proposition chunking — benchmarked on 1 200 questions across three domains. The winner is not what I expected.',
    author: MOCK_AUTHORS[4],
    topics: [MOCK_TOPICS[3], MOCK_TOPICS[0]],
    likeCount: 517,
    commentCount: 64,
    viewCount: 14200,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p-ac3',
    title: 'Tool use patterns that survive production: a field guide',
    excerpt: 'After 18 months running tool-using agents in production, here are the patterns that held up, the ones that failed, and why the difference matters.',
    coverImageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    author: MOCK_AUTHORS[4],
    topics: [MOCK_TOPICS[1], MOCK_TOPICS[0]],
    likeCount: 392,
    commentCount: 51,
    viewCount: 9800,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    readTimeMinutes: 10,
  },
  {
    id: 'p-ac4',
    title: 'Fine-tuning on 4 consumer GPUs: a no-nonsense QLoRA guide for 2025',
    excerpt: 'The landscape shifted again. Flash Attention 3, paged optimisers, and gradient checkpointing together let you fine-tune 7B models in 10 GB of VRAM.',
    author: MOCK_AUTHORS[4],
    topics: [MOCK_TOPICS[2], MOCK_TOPICS[5]],
    likeCount: 631,
    commentCount: 89,
    viewCount: 21600,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p-ac5',
    title: 'Context window size is a red herring',
    excerpt: 'Everyone is racing to 10M tokens. But retrieval quality degrades with context length, and most applications only need the right 2 000 tokens — not all of them.',
    coverImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    author: MOCK_AUTHORS[4],
    topics: [MOCK_TOPICS[0], MOCK_TOPICS[3]],
    likeCount: 448,
    commentCount: 72,
    viewCount: 12900,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    readTimeMinutes: 5,
  },
  // Alice Morgan's posts
  {
    id: 'p-am1',
    title: 'LLM evaluation is broken — and here is how to fix it',
    excerpt: 'Most eval suites measure what is easy to measure, not what matters. I spent three months building an eval framework for production systems. This is what I learned.',
    coverImageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    author: MOCK_AUTHORS[5],
    topics: [MOCK_TOPICS[0]],
    likeCount: 534,
    commentCount: 81,
    viewCount: 15800,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    readTimeMinutes: 9,
  },
  {
    id: 'p-am2',
    title: 'Prompt reliability at scale: what breaks when you have 10M calls per day',
    excerpt: 'Small phrasing changes cause 15% output variance at scale. Here are the patterns I use to write prompts that hold up under distribution shift.',
    author: MOCK_AUTHORS[5],
    topics: [MOCK_TOPICS[0], MOCK_TOPICS[1]],
    likeCount: 387,
    commentCount: 53,
    viewCount: 10200,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p-am3',
    title: 'From research to product: the alignment tax is real',
    excerpt: 'Moving a fine-tuned model from benchmark-topping to actually-deployed costs more than you expect. A candid account of the last six months at Verita Labs.',
    coverImageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    author: MOCK_AUTHORS[5],
    topics: [MOCK_TOPICS[2], MOCK_TOPICS[0]],
    likeCount: 712,
    commentCount: 104,
    viewCount: 22400,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    readTimeMinutes: 7,
  },
  {
    id: 'p-am4',
    title: 'Multi-agent evals: how do you test something that is partly non-deterministic?',
    excerpt: 'Running evals on agent pipelines is hard. The outputs are long, the ground truth is fuzzy, and the system is stateful. Here is the framework that finally worked for us.',
    author: MOCK_AUTHORS[5],
    topics: [MOCK_TOPICS[1], MOCK_TOPICS[0]],
    likeCount: 291,
    commentCount: 44,
    viewCount: 8700,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  // Bob Nakamura's posts
  {
    id: 'p-bn1',
    title: 'Speculative decoding in production: the numbers nobody tells you',
    excerpt: 'Draft model acceptance rate drops sharply with longer prompts, and the memory overhead is non-trivial. Here are the real-world trade-offs from six months of running spec-dec at scale.',
    coverImageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80',
    author: MOCK_AUTHORS[6],
    topics: [MOCK_TOPICS[0]],
    likeCount: 463,
    commentCount: 67,
    viewCount: 13600,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
    readTimeMinutes: 8,
  },
  {
    id: 'p-bn2',
    title: 'KV cache is your biggest cost — here is how to shrink it',
    excerpt: 'At 10K concurrent users, KV cache dominates your GPU memory budget. Multi-query attention, grouped-query attention, and prefix sharing explained with actual numbers.',
    author: MOCK_AUTHORS[6],
    topics: [MOCK_TOPICS[0], MOCK_TOPICS[3]],
    likeCount: 318,
    commentCount: 41,
    viewCount: 9100,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p-bn3',
    title: 'MLOps for LLMs: what changed in 2025',
    excerpt: 'The tooling landscape shifted fast. vLLM, SGLang, and TensorRT-LLM all matured. Here is an honest comparison for teams choosing an inference stack today.',
    coverImageUrl: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&q=80',
    author: MOCK_AUTHORS[6],
    topics: [MOCK_TOPICS[5], MOCK_TOPICS[0]],
    likeCount: 225,
    commentCount: 29,
    viewCount: 6800,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    readTimeMinutes: 6,
  },
];

const MOCK_POST_DETAIL: PostDetail = {
  id: 'p-skill-induction',
  title: 'Skill Induction Heads: mechanistic evidence for few-shot learning in 70B models',
  excerpt: 'We isolate ~140 attention heads that implement in-context learning in large models and show that ablating them collapses few-shot accuracy to zero-shot baseline.',
  coverImageUrl: undefined,
  author: {
    id: 'u-ananya',
    username: 'ananya_roy',
    displayName: 'Ananya Roy',
    role: 'VERIFIED',
    organisation: 'Anthropic',
  },
  topics: [
    { id: 't-mech', name: 'mech-interp' },
    { id: 't-paper', name: 'paper' },
    { id: 't-align', name: 'alignment' },
    { id: 't-icl', name: 'in-context-learning' },
  ],
  likeCount: 487,
  commentCount: 62,
  viewCount: 18402,
  saveCount: 1204,
  isLikedByMe: false,
  isBookmarkedByMe: false,
  readTimeMinutes: 8,
  createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  sources: [
    { label: 'arxiv.org/abs/2511.04812', url: '#' },
    { label: 'github.com/anthropics/skill-induction-heads', url: '#' },
    { label: 'wandb.ai/ananya-roy/skill-induction/reports/…', url: '#' },
  ],
};

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: { id: 'u-olah', username: 'chris_olah', displayName: 'Chris Olah', role: 'VERIFIED', organisation: 'Anthropic' },
    text: "This is great. The most interesting part for me is the \"skill induction only above 30B\" finding — it's consistent with what we've been seeing internally on the SAE side. There's a phase transition where some bundle of capabilities arrives together, and it really does look like a circuit-level thing rather than a smooth scaling curve.\n\nQuestion: did you check whether the same 140 heads transfer across finetunes? Curious whether they survive RLHF.",
    likeCount: 184,
    isLikedByMe: true,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    replies: [
      {
        id: 'c1r1',
        author: { id: 'u-ananya', username: 'ananya_roy', displayName: 'Ananya Roy', role: 'VERIFIED', organisation: 'Anthropic' },
        text: "Yes — we ran the same probe on three RLHF'd checkpoints. ~92% of the heads survive, but the selectivity sharpens: the \"format\" sub-population gets noticeably more decisive after RLHF. We have a follow-up draft on this. Will share next week.",
        likeCount: 96,
        isLikedByMe: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        replies: [],
      },
      {
        id: 'c1r2',
        author: { id: 'u-sharkey', username: 'l_sharkey', displayName: 'L. Sharkey', role: 'USER', organisation: 'Apollo' },
        text: '+1 to this question — also curious about the cross-family case. Do the heads have a clean signature in residual space that survives different tokenizers? If yes, the "naming features" story actually has legs.',
        likeCount: 41,
        isLikedByMe: false,
        createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        replies: [],
      },
    ],
  },
  {
    id: 'c2',
    author: { id: 'u-helena', username: 'helena_park', displayName: 'Helena Park', role: 'VERIFIED', organisation: 'AISI' },
    text: "The line at the end — \"specific enough to be wrong\" — is the kind of framing this field has been missing. I want to push back gently on one thing though: ablation as evidence of necessity is fine, but it's not the same as evidence of mechanism. The cluster could be necessary because it's downstream of the real circuit, not because it is the real circuit.\n\nHave you tried activation patching from shuffled-demo runs into coherent-demo runs, instead of just ablating?",
    likeCount: 112,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    replies: [],
  },
  {
    id: 'c3',
    author: { id: 'u-marcus', username: 'marcus_chen', displayName: 'Marcus Chen', role: 'USER' },
    text: 'Reproduced the headline number on llama-3 70B-instruct: 62.4 → 42.7. Slightly less collapse than yours, probably because of the instruct overlay. Will post the full env in a few hours, but the effect is real and not noise.\n\nOne small thing: line 9 of the patching harness wants n_shot=5 as an int, not a string. Tripped me up for ten minutes.',
    likeCount: 67,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    replies: [],
  },
  {
    id: 'c4',
    author: { id: 'u-naomi', username: 'naomi_greene', displayName: 'Naomi Greene', role: 'VERIFIED', organisation: 'DeepMind' },
    text: "The three sub-populations — retrieval, format, predict — line up uncannily well with what we got from a totally different methodology (path patching on synthetic tasks). Either we're both seeing the same thing or we're both pattern-matching on the same coincidence. I'd bet on the former.",
    likeCount: 89,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    replies: [],
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ── Digest follow state (session-persistent) ──────────────
const _defaultFollowed = new Set<string>([
  'alignment', 'mech-interp', 'openai', 'anthropic', 'open-source', 'agents',
]);
const _followedTopics = new Set<string>(_defaultFollowed);
let _savedTopics = new Set<string>(_defaultFollowed);

// ── Digest mock data ───────────────────────────────────────
const DIGEST_LIST_LOGGEDIN: DigestListItem[] = [
  { date: '2026-06-10', displayDate: 'Wed Jun 10', title: 'GPT-5o sets new reasoning benchmarks', eventCount: 6, readTimeMinutes: 7 },
  { date: '2026-06-09', displayDate: 'Tue Jun 09', title: 'Anthropic publishes Constitutional AI 2.0 update', eventCount: 5, readTimeMinutes: 5 },
  { date: '2026-06-08', displayDate: 'Mon Jun 08', title: 'Agents week: 10 teams ship autonomous coding tools', eventCount: 9, readTimeMinutes: 10 },
  { date: '2026-06-07', displayDate: 'Sun Jun 07', title: 'RLHF under scrutiny — alignment researchers push back', eventCount: 7, readTimeMinutes: 8 },
  { date: '2026-06-06', displayDate: 'Sat Jun 06', title: 'Gemini 3.5 Flash launches with 2M context window', eventCount: 10, readTimeMinutes: 11 },
  { date: '2026-06-05', displayDate: 'Fri Jun 05', title: 'Sparse autoencoders reveal hidden model circuits', eventCount: 6, readTimeMinutes: 6 },
  { date: '2026-06-04', displayDate: 'Thu Jun 04', title: 'Claude 4 Opus scores 87% on SWE-bench', eventCount: 8, readTimeMinutes: 9 },
  { date: '2026-06-03', displayDate: 'Wed Jun 03', title: 'Figure 02 robot learns manipulation from video', eventCount: 5, readTimeMinutes: 5 },
  { date: '2026-06-02', displayDate: 'Tue Jun 02', title: 'OpenAI and Google race to ship voice-native models', eventCount: 7, readTimeMinutes: 7 },
  { date: '2026-06-01', displayDate: 'Mon Jun 01', title: 'New evals expose reasoning gaps in frontier models', eventCount: 11, readTimeMinutes: 12 },
  { date: '2026-05-31', displayDate: 'Sun May 31', title: 'Multi-agent orchestration: the new infrastructure layer', eventCount: 6, readTimeMinutes: 6 },
  { date: '2026-05-30', displayDate: 'Sat May 30', title: 'vLLM 0.5 cuts inference latency by 40%', eventCount: 7, readTimeMinutes: 8 },
  { date: '2026-05-29', displayDate: 'Fri May 29', title: 'Meta releases Llama 4 Scout — 109B MoE, open weights', eventCount: 8, readTimeMinutes: 9 },
  { date: '2026-05-28', displayDate: 'Thu May 28', title: 'HuggingFace hits 1M public models milestone', eventCount: 4, readTimeMinutes: 4 },
  { date: '2026-05-27', displayDate: 'Wed May 27', title: 'Robotics-foundation models: a progress report', eventCount: 7, readTimeMinutes: 8 },
  { date: '2026-05-26', displayDate: 'Tue May 26', title: 'Mistral Medium 3 matches GPT-4o on coding benchmarks', eventCount: 5, readTimeMinutes: 5 },
  { date: '2026-05-25', displayDate: 'Mon May 25', title: 'Five key mechanistic interpretability papers this week', eventCount: 10, readTimeMinutes: 11 },
  { date: '2026-05-24', displayDate: 'Sun May 24', title: 'RAG vs fine-tuning: enterprise teams weigh in', eventCount: 6, readTimeMinutes: 7 },
  { date: '2026-05-23', displayDate: 'Sat May 23', title: 'Google DeepMind ships Gemma 3 27B open model', eventCount: 5, readTimeMinutes: 5 },
  { date: '2026-05-22', displayDate: 'Fri May 22', title: 'What chain-of-thought actually does under the microscope', eventCount: 9, readTimeMinutes: 10 },
  { date: '2026-05-21', displayDate: 'Thu May 21', title: 'Browser-use and computer-use agents proliferate', eventCount: 7, readTimeMinutes: 7 },
  { date: '2026-05-20', displayDate: 'Wed May 20', title: 'Multimodal week: audio, video, and 3D at the frontier', eventCount: 8, readTimeMinutes: 9 },
  { date: '2026-05-19', displayDate: 'Tue May 19', title: 'LangChain 0.3 overhauls agent abstractions', eventCount: 4, readTimeMinutes: 4 },
  { date: '2026-05-18', displayDate: 'Mon May 18', title: 'Benchmark inflation: why MMLU scores are plateauing', eventCount: 6, readTimeMinutes: 6 },
  { date: '2026-05-17', displayDate: 'Sun May 17', title: 'OpenAI o4-mini tops math olympiad problems', eventCount: 7, readTimeMinutes: 8 },
  { date: '2026-05-16', displayDate: 'Sat May 16', title: 'Pretraining data wars: quality over quantity', eventCount: 5, readTimeMinutes: 5 },
  { date: '2026-05-15', displayDate: 'Fri May 15', title: 'Inference at scale: Groq, Cerebras, and vLLM compared', eventCount: 8, readTimeMinutes: 9 },
  { date: '2026-05-14', displayDate: 'Thu May 14', title: 'Constitutional AI 2.0 — Anthropic details the next iteration', eventCount: 7, readTimeMinutes: 8 },
  { date: '2026-05-13', displayDate: 'Wed May 13', title: 'Computer vision meets robotics: five breakout projects', eventCount: 6, readTimeMinutes: 6 },
  { date: '2026-05-12', displayDate: 'Tue May 12', title: 'The state of open-source LLMs: May 2026 edition', eventCount: 9, readTimeMinutes: 10 },
];

const DIGEST_LIST_LOGGEDOUT: DigestListItem[] = [
  { date: '2026-06-10', displayDate: 'Wed Jun 10', title: 'Gemini 3.5 launches — what the benchmarks show', eventCount: 8, readTimeMinutes: 8 },
  { date: '2026-06-09', displayDate: 'Tue Jun 09', title: 'GPT-5o and the weekend reasoning wars', eventCount: 6, readTimeMinutes: 6 },
  { date: '2026-06-08', displayDate: 'Mon Jun 08', title: 'Agents everywhere: a week of autonomous AI releases', eventCount: 12, readTimeMinutes: 13 },
  { date: '2026-06-04', displayDate: 'Thu Jun 04', title: 'Claude 4 Opus scores 87% on SWE-bench', eventCount: 7, readTimeMinutes: 7 },
];

const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: 'research',
    label: 'Research',
    sortOrder: 0,
    topics: [
      { id: 'alignment',   name: 'alignment',   displayName: 'Alignment',              totalPostCount: 142, postsThisWeek: 18, postsPrevWeek: 12, activityScore: 0.92, isHot: true,  followerCount: 4210 },
      { id: 'mech-interp', name: 'mech-interp', displayName: 'Mech Interpretability',  totalPostCount: 87,  postsThisWeek: 11, postsPrevWeek: 8,  activityScore: 0.78, isHot: true,  followerCount: 2890 },
      { id: 'rlhf',        name: 'rlhf',        displayName: 'RLHF',                   totalPostCount: 64,  postsThisWeek: 6,  postsPrevWeek: 7,  activityScore: 0.55, isHot: false, followerCount: 1940 },
      { id: 'reasoning',   name: 'reasoning',   displayName: 'Reasoning',              totalPostCount: 109, postsThisWeek: 14, postsPrevWeek: 10, activityScore: 0.85, isHot: true,  followerCount: 3120 },
      { id: 'fine-tuning', name: 'fine-tuning', displayName: 'Fine-tuning',            totalPostCount: 48,  postsThisWeek: 5,  postsPrevWeek: 6,  activityScore: 0.42, isHot: false, followerCount: 1530 },
      { id: 'pretraining', name: 'pretraining', displayName: 'Pretraining',            totalPostCount: 33,  postsThisWeek: 3,  postsPrevWeek: 4,  activityScore: 0.30, isHot: false, followerCount: 980  },
    ],
  },
  {
    id: 'models',
    label: 'Models & Labs',
    sortOrder: 1,
    topics: [
      { id: 'openai',          name: 'openai',          displayName: 'OpenAI',         totalPostCount: 188, postsThisWeek: 24, postsPrevWeek: 19, activityScore: 0.98, isHot: true,  followerCount: 9840 },
      { id: 'anthropic',       name: 'anthropic',       displayName: 'Anthropic',      totalPostCount: 165, postsThisWeek: 21, postsPrevWeek: 17, activityScore: 0.95, isHot: true,  followerCount: 7720 },
      { id: 'google-deepmind', name: 'google-deepmind', displayName: 'Google DeepMind',totalPostCount: 122, postsThisWeek: 15, postsPrevWeek: 11, activityScore: 0.82, isHot: true,  followerCount: 6230 },
      { id: 'meta-ai',         name: 'meta-ai',         displayName: 'Meta AI',        totalPostCount: 98,  postsThisWeek: 9,  postsPrevWeek: 8,  activityScore: 0.66, isHot: false, followerCount: 4110 },
      { id: 'mistral',         name: 'mistral',         displayName: 'Mistral',        totalPostCount: 56,  postsThisWeek: 5,  postsPrevWeek: 5,  activityScore: 0.48, isHot: false, followerCount: 2200 },
      { id: 'open-source',     name: 'open-source',     displayName: 'Open Source',    totalPostCount: 74,  postsThisWeek: 8,  postsPrevWeek: 7,  activityScore: 0.60, isHot: false, followerCount: 3350 },
    ],
  },
  {
    id: 'applications',
    label: 'Applications',
    sortOrder: 2,
    topics: [
      { id: 'agents',          name: 'agents',          displayName: 'AI Agents',      totalPostCount: 221, postsThisWeek: 31, postsPrevWeek: 22, activityScore: 1.00, isHot: true,  followerCount: 11200 },
      { id: 'rag',             name: 'rag',             displayName: 'RAG',            totalPostCount: 84,  postsThisWeek: 8,  postsPrevWeek: 7,  activityScore: 0.62, isHot: false, followerCount: 3740  },
      { id: 'coding',          name: 'coding',          displayName: 'Coding Tools',   totalPostCount: 67,  postsThisWeek: 6,  postsPrevWeek: 6,  activityScore: 0.54, isHot: false, followerCount: 2890  },
      { id: 'computer-vision', name: 'computer-vision', displayName: 'Computer Vision',totalPostCount: 45,  postsThisWeek: 4,  postsPrevWeek: 4,  activityScore: 0.38, isHot: false, followerCount: 1640  },
      { id: 'robotics',        name: 'robotics',        displayName: 'Robotics',       totalPostCount: 39,  postsThisWeek: 3,  postsPrevWeek: 3,  activityScore: 0.33, isHot: false, followerCount: 1420  },
      { id: 'multimodal',      name: 'multimodal',      displayName: 'Multimodal',     totalPostCount: 77,  postsThisWeek: 9,  postsPrevWeek: 7,  activityScore: 0.65, isHot: true,  followerCount: 2970  },
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering',
    sortOrder: 3,
    topics: [
      { id: 'inference',   name: 'inference',   displayName: 'Inference',    totalPostCount: 58, postsThisWeek: 6, postsPrevWeek: 5, activityScore: 0.50, isHot: false, followerCount: 2010 },
      { id: 'vllm',        name: 'vllm',        displayName: 'vLLM',         totalPostCount: 44, postsThisWeek: 4, postsPrevWeek: 4, activityScore: 0.40, isHot: false, followerCount: 1580 },
      { id: 'langchain',   name: 'langchain',   displayName: 'LangChain',    totalPostCount: 36, postsThisWeek: 3, postsPrevWeek: 3, activityScore: 0.32, isHot: false, followerCount: 1230 },
      { id: 'benchmarks',  name: 'benchmarks',  displayName: 'Benchmarks',   totalPostCount: 93, postsThisWeek: 12, postsPrevWeek: 9, activityScore: 0.75, isHot: true,  followerCount: 3480 },
      { id: 'evals',       name: 'evals',       displayName: 'Evals',        totalPostCount: 71, postsThisWeek: 7, postsPrevWeek: 6, activityScore: 0.58, isHot: false, followerCount: 2620 },
      { id: 'huggingface', name: 'huggingface', displayName: 'Hugging Face', totalPostCount: 82, postsThisWeek: 9, postsPrevWeek: 8, activityScore: 0.68, isHot: false, followerCount: 3070 },
    ],
  },
];

export const contentService = {
  getPosts(cursor: string | null, topic: string | null): Promise<FeedPage> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let posts = topic
          ? BASE_POSTS.filter((p) => p.topics.some((t) => t.name === topic))
          : BASE_POSTS;

        if (cursor === 'page2') {
          posts = shuffle(BASE_POSTS).slice(0, 4);
          resolve({ posts, nextCursor: null });
        } else {
          resolve({ posts, nextCursor: posts.length === BASE_POSTS.length ? 'page2' : null });
        }
      }, 400);
    });
  },

  toggleLike(postId: string): Promise<{ likeCount: number; isLikedByMe: boolean }> {
    return new Promise((resolve) => {
      const post = BASE_POSTS.find((p) => p.id === postId);
      if (!post) return;
      post.isLikedByMe = !post.isLikedByMe;
      post.likeCount += post.isLikedByMe ? 1 : -1;
      setTimeout(() => resolve({ likeCount: post.likeCount, isLikedByMe: post.isLikedByMe }), 200);
    });
  },

  getAvailableTopics() {
    return MOCK_TOPICS;
  },

  getPost(id: string): Promise<PostDetail> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const base = BASE_POSTS.find((p) => p.id === id);
        if (base) {
          resolve({
            ...base,
            saveCount: 0,
            isBookmarkedByMe: false,
            readTimeMinutes: 5,
            sources: [],
          });
        } else {
          resolve({ ...MOCK_POST_DETAIL, id });
        }
      }, 300);
    });
  },

  getComments(_postId: string): Promise<Comment[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_COMMENTS]), 300);
    });
  },

  toggleBookmark(postId: string): Promise<{ saveCount: number; isBookmarkedByMe: boolean }> {
    return new Promise((resolve) => {
      MOCK_POST_DETAIL.isBookmarkedByMe = !MOCK_POST_DETAIL.isBookmarkedByMe;
      MOCK_POST_DETAIL.saveCount += MOCK_POST_DETAIL.isBookmarkedByMe ? 1 : -1;
      setTimeout(
        () =>
          resolve({
            saveCount: MOCK_POST_DETAIL.saveCount,
            isBookmarkedByMe: MOCK_POST_DETAIL.isBookmarkedByMe,
          }),
        200,
      );
      void postId;
    });
  },

  getPostsByAuthor(username: string): Post[] {
    return BASE_POSTS.filter((p) => p.author.username === username);
  },

  getTodayDigest(): TodayDigest {
    const today = new Date();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      date: today.toISOString().split('T')[0],
      title: `Your ${weekday} Digest`,
      topStorySubtitle: 'Gemini 3.5 launches, Claude 4 tops SWE-bench, and the agents week in review',
      eventCount: 8,
      readTimeMinutes: 8,
      generatedAt: '06:00 AM',
      status: 'generated',
    };
  },

  getDigestList(isLoggedIn: boolean): DigestListItem[] {
    return isLoggedIn ? DIGEST_LIST_LOGGEDIN : DIGEST_LIST_LOGGEDOUT;
  },

  getTopicCategories(): TopicCategory[] {
    return TOPIC_CATEGORIES;
  },

  getFollowedTopics(): Set<string> {
    return new Set(_followedTopics);
  },

  toggleTopicFollow(tag: string): void {
    if (_followedTopics.has(tag)) {
      _followedTopics.delete(tag);
    } else {
      _followedTopics.add(tag);
    }
  },

  saveTopicPreferences(): void {
    _savedTopics = new Set(_followedTopics);
  },

  getLastSavedTopics(): Set<string> {
    return new Set(_savedTopics);
  },

  resetTopicPreferences(): void {
    _followedTopics.clear();
    _savedTopics.forEach(tag => _followedTopics.add(tag));
  },
};
