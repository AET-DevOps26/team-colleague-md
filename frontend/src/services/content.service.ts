import type { Comment, FeedPage, Post, PostDetail } from '../types';

const MOCK_TAGS = [
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
];

const BASE_POSTS: Post[] = [
  {
    id: 'p1',
    title: 'How I fine-tuned Llama 3 on 4 GPUs in under 6 hours',
    excerpt: 'A practical walkthrough of QLoRA fine-tuning with Flash Attention 2, gradient checkpointing, and a few tricks that cut my training time by 40%.',
    coverImageUrl: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80',
    author: MOCK_AUTHORS[0],
    tags: [MOCK_TAGS[2], MOCK_TAGS[5]],
    likeCount: 312,
    commentCount: 47,
    viewCount: 8920,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p2',
    title: 'Building a research agent that actually works in production',
    excerpt: 'After six months running autonomous agents in production, here is what I learned about tool design, failure modes, and keeping humans in the loop.',
    author: MOCK_AUTHORS[1],
    tags: [MOCK_TAGS[1], MOCK_TAGS[0]],
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
    tags: [MOCK_TAGS[3], MOCK_TAGS[0]],
    likeCount: 445,
    commentCount: 62,
    viewCount: 12300,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p4',
    title: 'GPT-4o vs Claude 3.5 Sonnet on code generation — a fair comparison',
    excerpt: 'I ran 200 coding tasks across both models with identical prompts and scoring criteria. The results surprised me.',
    author: MOCK_AUTHORS[3],
    tags: [MOCK_TAGS[0]],
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
    tags: [MOCK_TAGS[4], MOCK_TAGS[0]],
    likeCount: 231,
    commentCount: 28,
    viewCount: 6800,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
  },
  {
    id: 'p6',
    title: 'Mixtral MoE: understanding sparse expert routing',
    excerpt: 'Mixture-of-experts routing is elegant but non-obvious. This post builds intuition from first principles and explores why Mixtral uses top-2 routing.',
    author: MOCK_AUTHORS[1],
    tags: [MOCK_TAGS[0], MOCK_TAGS[5]],
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
    tags: [MOCK_TAGS[0]],
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
    tags: [MOCK_TAGS[1], MOCK_TAGS[0]],
    likeCount: 412,
    commentCount: 73,
    viewCount: 11500,
    isLikedByMe: false,
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
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
  tags: [
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

export const contentService = {
  getPosts(cursor: string | null, tag: string | null): Promise<FeedPage> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let posts = tag
          ? BASE_POSTS.filter((p) => p.tags.some((t) => t.name === tag))
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

  getAvailableTags() {
    return MOCK_TAGS;
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

  getTodayDigest() {
    return {
      date: new Date().toISOString().split('T')[0],
      title: "Today's AI Digest",
      topStorySubtitle: 'OpenAI releases o3-mini with extended thinking at competitive pricing',
      eventCount: 8,
      readTimeMinutes: 6,
    };
  },
};
