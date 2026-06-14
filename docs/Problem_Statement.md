# **Problem Statement - Verita**

## **1. Problem Definition & Motivation**

The AI Industry is moving at an unpredictable pace. Every day brings new model releases, framework updates, and announcements. This information first appears on technical platforms like GitHub, Hugging Face, and LLM Arena. Then developers, content creators, and enthusiasts process this information and share it through social media, blogs, and forums, such as Twitter, YouTube, and Reddit. We found that there are three important values for AI-related information: **timeliness** (models can quickly become outdated), **credibility** (clickbait headlines exaggerate capabilities), and **usefulness** (hyped tools often provide little practical value for real work).
 However, users like AI practitioners, students, and enthusiasts who need useful AI knowledge are facing the following challenges:

* **Information is scattered**: Useful AI insights are buried across Twitter threads, YouTube videos, Reddit discussions, and personal blogs, with no central place to find them
* **Hard to judge quality**: No clear way to tell if a new model or tool actually works well before spending time testing it yourself
* **Missing practical context**: Announcements show what's new, but not how to use it in real projects or what problems it actually solves
* **No community verification**: Users can't easily find others' real experiences with tools before trying them
* **Time-consuming search**: Finding one useful AI tutorial or workflow example requires filtering through dozens of low-quality posts

Verita is an AI-focused community platform where developers, researchers, and enthusiasts share and discover practical AI knowledge. Unlike general social media, we only host AI content. Unlike news aggregators, we encourage original posts with actionable insights, code examples, workflow tutorials, and real tool comparisons. Our platform uses AI to keep posts concise (auto-summaries), organized (auto-topic suggestions), and trustworthy (community sentiment scores). The goal: make every minute you spend here directly useful for your AI work or learning.

---

## **2. Proposed Solution Overview**

**Key Features**

**Content Creation & Sharing**

* **Markdown-Native Editor**: Full Markdown support with code syntax highlighting and real-time preview, enabling users to share copyable code examples, tutorials, and technical documentation
* **Source Attribution**: Inline hyperlinks within the body and a dedicated source section at the end of each post for citing external references, maintaining transparency and credibility

**AI-Powered Intelligence**

* **Automatic Summarization**: AI generates summaries of long posts, helping readers quickly grasp key points before diving into details
* **AI Daily Digest**: AI-generated summaries of trending topics and important developments in your subscribed areas
* **Content Verification** (Optional): AI-powered fact-checking that validates information sources and detects potential misinformation
* **Semantic Search** (Optional): RAG-powered search that understands intent and finds relevant discussions based on meaning, not just keywords

**Personalized Discovery**

* **Smart Feed Algorithm**: Homepage recommendation system that learns from your engagement patterns to surface relevant and high-quality posts
* **Topic Subscriptions**: Follow specific topics (\#OpenAI, \#LangChain, \#ComputerVision) to customize your content stream

**Community & Trust**

* **Verified Accounts**: Official verification system for company accounts and recognized experts, with distinct UI badges indicating credible sources
* **Rich Engagement**: Threaded comments, likes/dislikes, post bookmarking, and in-depth discussions around shared knowledge


**User Experience**

* **Clean Interface**: Minimalist design focused on readability and information density
* **Quick Navigation**: Fast filtering by topics, trending sections, and time ranges
* **Save & Organize**: Bookmark valuable posts for future reference and build your personal knowledge library

---

## **3. Functional Requirements - Epics & User Stories**

**Priority Levels**:

* **Must-have (P0)**: Core MVP functionality
* **Should-have (P1)**: Important features for user experience
* **Nice-to-have (P2)**: Optional features

---

### **Epic 1: User Management & Authentication**

**Description**: User registration, login, profile management, role-based access control for regular users and administrators, and an account verification system for official organizations and recognized experts.

**Must-have (P0)**:
* As a new visitor, I want to explore the platform as a guest, so that I can see the value before creating an account
* As a new visitor, I want to create an account with email and password, so that I can access the platform and participate in the community
* As a registered user, I want to securely log in to my account, so that I can access personalized content and my saved posts
* As an administrator, I want to manage user roles and permissions so that I can moderate the platform effectively

**Should-have (P1)**:
* As a user, I want to manage my profile information (bio, expertise areas, social links), so that other community members understand my background and interests
* As any user, I want to see a distinct verification badge on verified accounts' profiles and posts, so that I can easily identify official organizations and credible experts

**Nice-to-have (P2)**:
* As a user representing an organization or recognized expert, I want to apply for account verification by submitting verification request with supporting information, so that I can be recognized as an official source
* As an administrator, I want to review verification applications in a dashboard and approve or reject requests, so that only legitimate organizations and experts receive verified status
* As a verified account, I want my posts to be prioritized in trending sections and recommendation algorithms, so that official announcements reach the community more effectively
* As a verified account, I want special formatting options for posts (e.g., announcement banners, pinned posts), so that important official updates stand out visually

---

### **Epic 2: Content Creation & Posting**

**Description**: Post creation system with Markdown editing capabilities and source attribution.

**Must-have (P0)**:

* As a user, I want to create a new post with a title and Markdown-formatted body, so that I can share AI knowledge with the community
* As a user, I want to use a Markdown editor with syntax highlighting for code blocks, so that I can format technical documentation easily
* As a user, I want to add topics to my post during creation, so that others can discover my content through relevant areas of interest
* As a user, I want to insert inline hyperlinks within my post body, so that I can reference external resources directly where they are relevant
* As a user, I want to add a dedicated source section at the end of my post, so that I can clearly list and credit the external references behind my content

**Should-have (P1)**:

* As a user, I want to see real-time preview while editing Markdown, so that I can verify my formatting before publishing
* As a user, I want my post to be automatically saved as a draft while I am editing, so that I never lose work if I close the browser or navigate away unexpectedly
* As a user, I want to explicitly save a post as a draft without publishing it, so that I can continue writing it later at my own pace
* As a user, I want to view and manage all my drafts and published posts from my profile page, so that I have a single place to track everything I have written
* As a user, I want to publish a draft or unpublish a published post at any time, so that I can control the visibility of my content
* As a post author, I want to edit my published posts to correct mistakes or add updates, so that my content remains accurate
* As a post author, I want to delete my own posts, so that I can remove outdated or incorrect information
* As a user, I want to insert images into my post via URL or file upload, so that I can illustrate concepts and share visual examples alongside my text
* As a user creating a post, I want to upload a cover image, so that my post is more visually appealing and engaging in the feed

---

### **Epic 3: AI-Powered Content Intelligence**

**Should-have (P1)**:

* As a reader viewing a long post, I want to see an AI summary, so that I can quickly understand key points before deciding to read the full content
* As a registered user, I want to receive a daily AI-generated digest summarizing the past day's AI news and developments based on my subscribed topics, so that I can stay informed without having to browse the platform every day
* As a user reading the AI digest, I want each item to include a clear source attribution linking back to the original post or external reference, so that I can verify information and explore further if needed

**Nice-to-have (P2)**:

* As a post author, I want the system to automatically suggest relevant topics based on my post content, so that I don't need to manually categorize from many options
* As a user, I want to see a sentiment score (e.g., "75% bullish" or "30% skeptical") on posts about new AI developments, so that I can gauge community reception and distinguish hype from substance
* As a platform administrator or user, I want the system to automatically evaluate and flag potentially fake news, so that the community remains a trusted source of accurate information
* As a user, I want to customize my digest frequency (daily, weekly, or disabled), so that I control the volume of information I receive
* As a user, I want to choose whether I receive digests and alerts via email or platform inbox, so that I am notified through my preferred communication channel
* As a user, I want to receive in-app notifications when new posts appear in my subscribed topics, so that I don't miss important updates
* As a user, I want to configure notification preferences for different activities (new posts, comments on my posts, replies to my comments), so that I'm alerted to what matters most

---

### **Epic 4: Community Engagement & Interaction**

**Description**: Social features enabling discussions, feedback, and knowledge exchange through comments, likes, and bookmarking.

**Must-have (P0)**:

* As a user, I want to comment on posts to share my experiences and insights, so that I can contribute to the discussion and help others learn
* As a user, I want to reply to an existing comment, so that I can engage in threaded conversations around specific points
* As a user, I want to click a share button on any post to copy its link, so that I can easily share content with others outside the platform


**Should-have (P1)**:
* As a user, I want to like posts that I find valuable or dislike low-quality content, so that I can help surface useful information to the community
* As a user, I want to save and unsave posts to my personal library, so that I can reference important information later
* As a comment author, I want to delete my own comments, so that I can remove inappropriate remarks
* As a post author, I want to delete comments on my posts if necessary, so that I can moderate discussions on my content

**Nice-to-have (P2)**:

* As a user, I want to like comments I find helpful, so that the most valuable replies are surfaced to the top of the discussion
* As a user, I want to mention other users with @username in comments, so that I can directly notify them and bring them into the conversation
* As a user, I want to follow other users whose content I trust, so that their posts appear in my feed alongside topic-based content
* As a user, I want to sort comments by newest or most liked, so that I can navigate long discussions more efficiently

---

### **Epic 5: Personalized Discovery & Feed**

**Must-have (P0)**:

* As a user, I want to view a homepage feed showing recent posts, so that I can discover new AI content
* As a user, I want to filter the feed by specific topics, so that I can focus on particular areas of interest

**Should-have (P1)**:

* As a user, I want to subscribe to a specific topic (e.g., \#OpenAI, \#Claude), so that I can easily filter all new content related to that subject
* As a user, I want to see the total post count and past-week growth for each topic when browsing or selecting topics, so that I can identify trending areas and make informed subscription choices
* As a user, I want my homepage feed to show personalized recommendations based on posts I've engaged with and topics I've subscribed to, so that I discover relevant content without manual searching

**Nice-to-have (P2)**:

* As a user, I want to search for posts using natural language queries with RAG-based semantic search, so that I can find relevant discussions even when exact keywords don't match

---


### **Epic 6: Quality Control & Moderation**

**Description**: Community-driven and admin-managed moderation system to maintain content quality, prevent spam, and ensure platform guidelines are followed.

**Nice-to-have (P2)**:

* As an administrator, I want to view flagged content in a moderation dashboard, so that I can efficiently review and take action on reports
* As an administrator, I want to delete posts, comments, or ban users who repeatedly violate guidelines, so that the platform remains high-quality
* As a user, I want to flag/report posts or comments that violate guidelines (spam, misinformation, inappropriate content), so that moderators can review them
* As a user, I want to see transparent moderation (e.g., "\[deleted by moderator\]" labels), so that I understand when content has been removed and why

---

## **4. Target Users & Their Needs**

Verita serves five distinct user groups within the AI community:

| User Type                   | Who They Are                                                 | What They Need                                                                               | How They Use Verita                                                                |
| --------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **AI/ML Developer**         | Software engineers working with AI/ML models and frameworks  | Find relevant new models, validate claims through peer experiences, track AI company updates | Topic filtering, semantic search, discussions, sentiment analysis, personalized feed |
| **Tech Manager**            | CTOs and engineering leaders evaluating AI tools             | Cost-effective solutions, industry trends, business value assessment                         | Daily digest, trending topics, sentiment scores, saved posts                       |
| **CS Student / Enthusiast** | Learners building AI knowledge and exploring careers         | Accessible learning resources, community guidance, avoid hype                                | Daily digest, subscriptions, discussions, summaries, trending                      |
| **Vibe Coder**              | Experimental developers trying and sharing new tools quickly | Share discoveries, get quick feedback, track cutting-edge developments                       | Post creation, auto-summarization, auto-topic suggestion, engagement               |
| **Verified Account**        | Official AI company reps and recognized experts              | Official announcements, build credibility, reach audience                                    | Verified badge, post creation, community engagement, priority (P2)                 |

---

## **5. GenAI Integration Strategy**

GenAI transforms Verita from a generic forum into an intelligent knowledge platform. Rather than overwhelming users with raw information, AI actively processes, organizes, and curates content to surface genuine value while filtering noise.

### **Core GenAI Features (P1 - Should-have)**

**On-Demand Post Summarization**
 Long technical posts can be overwhelming. Users click a "Generate Summary" button to get AI-extracted key points, helping them decide whether to read the full content. This scales to hundreds of daily posts without requiring manual summarization.

**AI Daily Digest**
 The system aggregates posts from the past 24 hours in users' subscribed topics, analyzes importance and relevance, and generates personalized daily summaries. This delivers curated insights without requiring constant platform monitoring.

### **Optional GenAI Features (P2 - Nice-to-have)**

**Automatic Topic Suggestion**
 When users create posts, the GenAI service analyzes content and suggests relevant topics (\#OpenAI, \#CodingTools, \#ComputerVision). This ensures proper categorization without forcing users to manually browse hundreds of topic options or remember exact topic names.

**Sentiment Analysis**
 Analyze post content and community engagement to generate sentiment scores (e.g., "75% bullish" or "30% skeptical"). Helps users distinguish genuine breakthroughs from marketing hype by showing community reception patterns.

**Content Verification**
 Detect potentially misleading claims or unverified information by cross-referencing statements with known facts. Flags posts that may require additional scrutiny before users act on them.

**Semantic Search (RAG)**
 Users search using natural language questions, and the system retrieves contextually relevant posts even when exact keywords don't match. Powered by vector embeddings and retrieval-augmented generation for concept-based discovery.

### **Why GenAI is Essential**

Traditional rule-based approaches cannot handle the complexity of AI content analysis:

* **Summarization at scale**: Manually summarizing user-generated content is impractical; GenAI enables consistent, real-time processing
* **Contextual understanding**: Simple keyword matching fails to capture semantic meaning (e.g., distinguishing "GPT" as a model vs general conversation); GenAI understands context
* **Personalized curation**: Aggregating and prioritizing hundreds of posts requires understanding topic relationships beyond basic filtering
* **Semantic discovery**: Users don't always know exact terminology; RAG enables finding discussions through conceptual similarity

Without GenAI, the platform would be just another forum drowning in information overload.

### **Implementation Approach**

**Model Strategy**: The platform supports both cloud-based models (OpenAI API for production-grade summarization and analysis) and local models (GPT4All or LLaMA for development and cost optimization). This dual approach provides flexibility for different deployment environments.

**Architecture**: The GenAI component runs as a separate Python microservice, containerized independently from the main Spring Boot backend. It communicates with the server through REST APIs, enabling modular development and independent scaling.

**RAG Implementation** (P2): If implemented, semantic search uses vector databases (Weaviate) to store post embeddings, enabling similarity-based retrieval beyond keyword matching.

---

## **6. Usage Scenarios**

### **Scenario 1: The Vibe Coder's Quick Share**

Alex, a vibe coder, discovers a promising new AI tool on GitHub at 2 AM. Excited, he opens Verita and **creates a post**, pasting in a messy 1,000-word README with scattered thoughts and multiple code snippets. He adds the source URL and **hits submit** without formatting.

Within seconds, the **GenAI service processes** the content. Other users browsing the feed see a **clean 3-bullet summary** at the top of Alex's post: "New lightweight vision model; 10x faster than YOLO; supports edge deployment." The system also **auto-suggested topics** \#ComputerVision and \#EdgeAI.

Three developers **comment within minutes** with their own experiences testing similar models. Alex's rough idea became an organized discussion without him spending 20 minutes formatting.

**Technical Flow**: Post creation → GenAI API summarization → Auto-topic suggestion → Database storage → Real-time feed update

---

### **Scenario 2: The Morning Intelligence Brief**

Tom, a CS student, opens Verita over breakfast. He **navigates to the "AI Digest"** and sees today's digest: "Top 3 Stories - OpenAI releases reasoning model update; Anthropic announces batch API; New image-gen model beats DALL-E on benchmarks."

Each story has a **2-sentence summary** and links to the original posts. Tom **clicks** the OpenAI story to read the full discussion, where developers are already **sharing code examples** and performance comparisons. In 5 minutes, he's caught up on overnight developments without scrolling through hundreds of posts.

**Technical Flow**: Kubernetes CronJob (4 AM daily) → Query top posts by engagement → LLM aggregation → Generate digest → Store in cache → Display on user dashboard

---

### **Scenario 3: The Precision Hunt**

Mike, a backend engineer, needs to find AI models for **"Python edge computing"** but doesn't know the exact terminology. He types "Python models for low-power devices" into the **search bar**.

The **semantic search** converts his query to a vector embedding and matches it against post content. Results include a post titled "DeepSeek-Lite Performance Review" that never used the phrase "low-power" but discussed "edge deployment" and "inference on Raspberry Pi." Mike **finds exactly what he needed** despite the keyword mismatch.

**Technical Flow** (P2 - Optional): Query → Vector embedding → RAG similarity search → Ranked results → Display with relevance scores

---

### **Scenario 4: The Viral Model Drop**

News breaks: **OpenAI just announced GPT-5**. Within 10 minutes, **traffic spikes 300%** as thousands of users rush to post reactions, leaks, and analyses.

The platform's **Kubernetes metrics** detect CPU usage hitting 80%. The **Horizontal Pod Autoscaler** immediately spins up 5 additional server instances. The **load balancer** distributes incoming requests. Users experience **no slowdown** - posts continue appearing in real-time, comments load instantly.

Meanwhile, the **admin team** receives an alert about the traffic spike and **opens the moderation dashboard**. They quickly **delete 3 duplicate spam posts** to keep the discussion clean. The platform handles the chaos smoothly.

**Technical Flow**: Traffic spike → Metrics Server alert → HPA triggers scaling → New pods deployed → Load distributed → System stable

---

### **Scenario 5: The Informed Decision Path**

Mike, a full-stack developer, is evaluating coding models for his startup. He **opens Verita** and **filters by the \#CodingModels topic** to see recent discussions. A post titled "OpenAI's new coding model - 30-minute reality check" catches his eye.

He **clicks the post** and immediately sees an **AI-generated summary**: "New model shows 40% improvement on HumanEval; strong Python performance but struggles with legacy code refactoring." Below it, a **sentiment indicator shows 65% bullish** - moderate enthusiasm, not pure hype.

Mike **scrolls through the comment thread**. One developer confirms strong Python results with code examples. Another warns about hallucinations when working with Rust. A third shares a comparison chart against GPT-4. Mike **saves the post** for his team meeting and **subscribes to the \#CodingModels topic** to track future updates.

In 3 minutes, Mike gathered validated insights from real practitioners - performance data, limitations, and specific use cases - without wading through marketing materials or testing the model himself.

**Technical Flow**: Topic filter → Post click → AI summary generation → Sentiment analysis (P2) → Comment thread → Save action → Topic subscription
