# Aemula Hackathon — Project Scope & Implementation Plan

**Event:** Generative Interfaces × Claude Hackathon (Anthropic, Redis, CopilotKit)
**Build Time:** 7 hours
**Deployment:** Vercel (separate demo environment)
**Demo App:** Two-tab Next.js application

---

## Executive Summary

We are building two AI-powered UI features for Aemula, a decentralized independent journalism platform. The two features — **Agentic Editorial Review** and **Ideological Vector Search** — are designed to showcase novel interface patterns where Claude drives the UI logic itself, not just the content. The editorial review transforms the writing-to-publishing workflow into a structural block-editing paradigm orchestrated by AI. The vector search visualizes ideological proximity in 3D space and morphs between contextual and ideological ranking views.

**Judging priorities (from handbook):**
1. **Novelty** — How fresh/unexpected is the UI pattern?
2. **Feel** — Does the interaction feel playful, intuitive, or newly possible?
3. **Integration** — Is Claude driving the interface logic, not just content?

Our strongest judging angles: The block-based editorial review is a novel decomposition of the editing process that no major editor offers. The 3D ideological vector search with morphing transitions is visually striking and conceptually original. Claude orchestrates both — it determines the block structure, generates review flags, and coordinates sub-tasks across model tiers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Next.js App (Tailwind CSS) — Vercel Deploy     │
│                                                 │
│  Tab 1: Draft & Editorial Review                │
│  Tab 2: Ideological Vector Search               │
├─────────────────────────────────────────────────┤
│  API Routes (Server-Side)                       │
│  ├── /api/editorial/*   → Claude API calls      │
│  ├── /api/chat          → Cmd+K chat endpoint   │
│  ├── /api/search/*      → Redis vector queries  │
│  └── /api/articles/*    → Article CRUD (Redis)  │
├─────────────────────────────────────────────────┤
│  Redis (Vector Store + Data Store)              │
│  ├── Ideological embeddings (graph-based)       │
│  ├── Contextual embeddings (article content)    │
│  └── Article content storage (JSON)             │
├─────────────────────────────────────────────────┤
│  Claude API                                     │
│  ├── Haiku  → Cmd+K chat, spell/grammar, fast   │
│  ├── Sonnet → Block decomposition, review flags │
│  └── Opus  → Polish/rewrite, voice matching     │
└─────────────────────────────────────────────────┘
```

---

## Pre-Hackathon Prep Checklist

### Accounts & Services
- [x] Anthropic API key (hackathon credits applied)
- [x] Redis Cloud account provisioned (use hackathon Redis credits if available, otherwise free tier)
- [x] Vercel project created and linked to repo

### Data Preparation
- [x] Export subset of Neo4j graph data: ~240 users, ~400 articles, and their relationships (support/disagree/neutral/report/author) as JSON
- [x] Generate **ideological embeddings** from graph structure (node2vec on the bipartite user-article graph) — store as JSON, ready to load into Redis
- [x] Generate **contextual embeddings** from article content (use OpenAI ada-002) — store as JSON, ready to load into Redis
- [x] Prepare 3-5 full demo articles with realistic content for the editorial review demo
- [x] Create a Redis data loading script (`scripts/seed-redis.ts`) that loads all embeddings + article data on deploy
- [ ] Pre-compute the 3 "suggested topics" for the search tab from article clustering

### Boilerplate & Dependencies
- [x] Next.js + Tailwind boilerplate project cloned and verified
- [ ] Install and verify key dependencies:
  - `@anthropic-ai/sdk` — Claude API
  - `redis` / `@redis/client` — Redis client
  - `@milkdown/crepe` — Rich text editor (or `@milkdown/kit` if Crepe is too opinionated)
  - `react-force-graph-3d` — 3D graph visualization
  - `@dnd-kit/core` + `@dnd-kit/sortable` — Drag-and-drop for blocks (if needed)
  - `framer-motion` — Morphing transitions for vector search view
  - `three` — Dependency for react-force-graph-3d
- [ ] Verify Milkdown/Crepe editor renders and can extract markdown content
- [ ] Verify react-force-graph-3d renders with sample data
- [ ] Set up environment variables template (`.env.example`)

### Embedding Strategy (Pre-Hackathon)

**Ideological Embeddings (graph-based):**
- Use node2vec on the bipartite graph to produce embeddings that capture ideological proximity
- User-article relationships (support = positive edge, disagree = negative edge, neutral = weak positive, report = strong negative) determine vector proximity
- Output: one vector per user node + one vector per article node
- Dimension: 128d is sufficient for demo (faster Redis queries, good enough for visualization)

**Contextual Embeddings (content-based):**
- Use embeddings from OpenAI `text-embedding-3-small` on article title + first 500 words
- Output: one vector per article
- Dimension: whatever the model outputs (1024 for Voyage, 1536 for OpenAI)
- These are used for topic/semantic search only

**Redis Storage Schema:**
```
# Ideological vectors
HASH article:{id} → { title, subtitle, author_id, content, created_at }
VECTOR INDEX idx:ideological → article:{id}:ideo_vec, user:{id}:ideo_vec (128d, COSINE)

# Contextual vectors  
VECTOR INDEX idx:contextual → article:{id}:ctx_vec (1024d or 1536d, COSINE)
```

---

## Feature 1: Agentic Editorial Review

### UI States & Flow

```
STATE 1: DRAFTING
┌──────────────────────────────────────┐
│ [Title textarea]                     │
│ [Subtitle textarea]                  │
│ [Milkdown/Crepe editor — body]       │
│                                      │
│ [Cmd+K overlay → chat side pane]     │
│                                      │
│ [Enter Editorial Review] button      │
└──────────────────────────────────────┘

STATE 2: EDITORIAL REVIEW (loading)
┌──────────────────────────────────────┐
│ Analyzing article...                 │
│ ██████████░░░░░░ Decomposing blocks  │
│ Show progress steps as they complete │
└──────────────────────────────────────┘

STATE 3: BLOCK EDITOR

 ┌──────────────────────────────────────────────────────┐
 │   BLOCKS (drag-reorderable)      REVIEW FLAGS        │
 │                                 (tied to the blocks) │
 │  ┌────────────────────────────┐ ┌─────────────────┐  │
 │  │  Block 1: [summary]     x  │ │ - Grammar       │  │
 │  │                           ───│ - Sources       │  │
 │  │  > expand                  │ │ - Redundant     │  │
 │  └────────────────────────────┘ └─────────────────┘  │
 │                                                      │
 │  ┌────────────────────────────┐ ┌─────────────────┐  │
 │  │ Block 2: [summary]     x   │ │ - Counter-Arg   │  │
 │  │                          ────│ - Move Block    │  │
 │  │  > expand                  │ │                 │  │
 │  └────────────────────────────┘ └─────────────────┘  │
 │                                                      │
 │  ┌────────────────────────────┐                      │
 │  │ Block 3: [summary]     x   │                      │
 │  │                            │                      │
 │  │  > expand                  │                      │
 │  └────────────────────────────┘                      │
 │  ┌───────────────────┐                               │
 │  │    + Add Block    │                               │
 │  └───────────────────┘                               │
 │  ┌───────────────────┐                               │
 │  │ Polish Article -> │                               │
 │  └───────────────────┘                               │
 │                                                      │
 └──────────────────────────────────────────────────────┘

STATE 4: POLISHED ARTICLE & Final Review
┌──────────────────────────────────────┐
│ [Title textarea]                     │
│ [Subtitle textarea]                  │
│ [Milkdown/Crepe editor — polished]   │
│                                      │
│ [Cmd+K overlay → chat side pane]     │
│                                      │
│ [← Back to Blocks]  [Publish]        │
└──────────────────────────────────────┘
```

### Claude API Call Sequence

**Step 1 — Block Decomposition (Sonnet)**
```
Input: Full article text
System prompt: You are an editorial analyst. Decompose this article into
  atomic "building blocks" where each block represents one cohesive idea
  or argument. Return JSON.
Output: {
  topic_summary: string,
  key_arguments: string[],
  blocks: [
    { id, summary, start_offset, end_offset, text_content }
  ]
}
```

**Step 2 — Block Review (Sonnet, parallelized per block)**
```
Input: Full article context + individual block text + block position
System prompt: Review this block in context of the full article. Check for:
  1. Spelling/grammar errors (list each with correction)
  2. Claims needing sources (explain why)
  3. Opportunities to address counter-arguments (explain value)
  4. Redundancy with other blocks (identify which blocks overlap)
  5. Better positioning in the article (suggest where and why)
  Return JSON with flags only for issues found (omit clean categories).
Output: {
  block_id: string,
  flags: [
    { type: "grammar", detail: string, correction: string },
    { type: "needs_source", detail: string, claim_text: string },
    { type: "counter_argument", detail: string, topic: string },
    { type: "redundant", detail: string, overlaps_with: block_id },
    { type: "reorder", detail: string, suggested_position: number }
  ]
}
```

**Step 3 — Source Search (Haiku + tool use OR web search)**
```
Triggered on user click of "Search Sources" button.
Input: The claim text that needs sourcing + article topic context
Output: Top 3-5 relevant sources with title, URL, and relevance explanation
```

**Step 4 — Counter-Argument Search (Redis vector search)**
```
Triggered on user click of "Find Opposing" button.
Input: The block's claim/argument as a query
Process: Embed the claim → search contextual vector space → filter for
  articles with opposing ideological vectors in ideological space
Output: Top 3 articles with opposing viewpoints, with title + summary
```

**Step 5 — Polish Article (Opus)**
```
Input: Original article + reordered/edited blocks (with additions and
  deletions applied) + author's writing samples (2-3 other articles by
  same author for voice matching, leveraging long context window)
System prompt: Rewrite this article to flow smoothly between the edited
  block structure. Preserve the author's voice and writing style. Make
  ONLY the minimal edits needed to ensure smooth transitions between
  blocks. Do not add new arguments, change tone, or restructure beyond
  what the block order dictates.
Output: Full polished article text
```

### Cmd+K Chat Implementation

- Keyboard listener for `Cmd+K` / `Ctrl+K` globally within the editor tab
- If text is selected in the editor before pressing Cmd+K, attach it as context
- Opens a centered modal with a text input
- On submit, sends to Claude Haiku (fast response) with system prompt:
  "You are an editorial assistant. The user is drafting a journalism article.
   Answer questions, suggest phrasings, provide context. Be concise."
- Response streams into a right-side panel that persists for the session
- Message history maintained in React state (session only, not persisted)

### Key Implementation Decisions

**Model Routing:**
| Task | Model | Reason |
|------|-------|--------|
| Cmd+K chat responses | Haiku | Speed is paramount for inline chat |
| Block decomposition | Sonnet | Needs strong structural reasoning |
| Block review (per block) | Sonnet | Balance of quality and parallelization speed |
| Source search | Haiku + web search tool | Fast retrieval, not deep reasoning |
| Polish/rewrite | Opus | Highest quality for voice matching + nuanced editing |


---

## Feature 2: Ideological Vector Search

### UI States & Flow

```
STATE 1: DEFAULT 3D VIEW
┌──────────────────────────────────────────────────┐
│ [🔍 Search articles by topic...]                 │
│ Suggested: [Climate Policy] [Tech Ethics] [...]  │
│                                                  │
│          ·    · ·                                │
│       ·  ·   🟦  ·  ·                            │
│     ·  🟡 ·  · · 🟡· ·                           │
│    · · ·  🟢  · · ·  ·                           │
│     🟡 ·  · ·  🟡 ·                              │
│       · ·   · ·  · ·                             │
│          · ·  ·                                  │
│                                                  │
│  🟢 = You  🟡 = Articles  · = Other Users        │
│  Click any article node to read                  │
└──────────────────────────────────────────────────┘

🟢 = Cyan (current user)
🟡 = Amber (articles)
·  = Light grey (other users)

STATE 2: SEARCH RESULTS — CONTEXTUAL HIGHLIGHT
┌──────────────────────────────────────────────────┐
│ [🔍 "climate policy"]                 [Clear ×]  │
│                                                  │
│          ·    · ·                                │
│       ·  ·   🟦  ·  ·                            │
│     ·  🟡 ·  · · ⬡· ·     ← relevant articles v  │
│    · · ·  🟢  · · ·  ·       highlighted as ⬡    │
│     ⬡ ·  · ·  🟡 ·                               │
│       · ·   ⬡ ·  · ·                             │
│          · ·  ·                                  │
│                                                  │
│  Found 12 articles about "climate policy"        │
│  Ranking by ideological proximity...             │
└──────────────────────────────────────────────────┘

STATE 3: SEARCH RESULTS — IDEOLOGICAL RANKING (morphed view)
 ┌─────────────────────────────────────────────┐
 │  [🔍 Start another search...]               │
 │                                             │
 │    🟢 You                                   │
 │    │                                        │
 │    │- Article A (0.92)                      │
 │    │- Article B (0.85)                      │
 │    │- Article C (0.82)                      │
 │    │- etc.                                  │
 │    │                                        │
 │    │                                        │
 │    │                                        │
 │    │                                        │
 │    │Hover for title                         │
 │    │Click to read                           │
 │                                             │
 │                                             │
 └─────────────────────────────────────────────┘

```

### Search Implementation

**Search Flow:**
1. User types topic query in search bar
2. Embed the query using same model as contextual embeddings
3. **Contextual search:** KNN query against `idx:contextual` in Redis → returns top N relevant article IDs (e.g., top 20)
4. **Ideological ranking:** For those N articles, compute cosine similarity between each article's ideological vector and the current user's ideological vector from `idx:ideological`
5. Sort by ideological proximity (closest = most aligned, farthest = most opposing)
6. Return ranked list with similarity scores

**API Route: `/api/search/articles`**
```
POST { query: string, user_id: string }
→ 1. Embed query (Voyage/OpenAI embedding call)
→ 2. Redis FT.SEARCH idx:contextual [query_vec] KNN 20
→ 3. For each result, Redis HGET article:{id}:ideo_vec
→ 4. Compute cosine similarity with user:{user_id}:ideo_vec
→ 5. Sort by similarity, return ranked articles with scores
```

### 3D Visualization

**Library:** `react-force-graph-3d`

**Default View:**
- Load all nodes (users + articles) with their ideological vectors
- Use UMAP or t-SNE to reduce ideological vectors to 3D for visualization (pre-compute during data prep, store as `x, y, z` on each node)
- Node colors: current user = cyan (#06B6D4), articles = amber (#F59E0B), other users = light grey (#D1D5DB)
- Node sizes: current user = large, articles = medium, other users = small
- Edges: not shown by default (too many), but could show on hover

**Search Transition Animation (Framer Motion):**
1. On search initiation: camera auto-rotates to center on user node, zoom out to see full graph
2. Non-relevant article nodes fade to very low opacity
3. Other user nodes fade to very low opacity
4. Relevant article nodes pulse/glow with highlight color
5. After ~1.5s: morph to ranked vertical layout
   - 3D graph fades, with ranked articles and user node morphing to vertical position
   - Nodes animate from their 3D positions to vertical line positions
   - User node at top, articles spaced vertically by similarity score

**Article Popup:**
- Hover on article node → tooltip with title
- Click on article node → modal with full article text, author, date
- Clean reading experience, close to return to graph

### Key Implementation Notes

**Pre-computed 3D positions:** Rather than running UMAP in the browser (heavy), pre-compute 3D coordinates from ideological embeddings during data prep. Store as `{ x, y, z }` on each node in Redis. This makes the initial graph render instant.

**Morph animation approach:** Use Framer Motion's `layoutId` or manual coordinate interpolation. The nodes in the 3D view and the vertical ranking view share the same article IDs, so we can animate between positions. Consider using a simpler approach: fade out 3D graph, fade in vertical list with staggered entry animation. This is faster to build and still looks great.

**Fallback if react-force-graph-3d is problematic:** Use `@react-three/fiber` + `@react-three/drei` for manual Three.js scene. More control but more code. Only switch if force-graph causes issues.

---

## Risk Mitigation & Scope Cuts

### If running behind, cut in this order:
1. **Cut first:** Morph animation between 3D and vertical view → just do a fade transition
2. **Cut second:** Counter-argument search from Redis vectors → just use web search for opposing viewpoints
3. **Cut third:** Cmd+K chat in polished article view → only support in drafting view
4. **Cut fourth:** Block drag-and-drop reordering → just show reorder suggestions, apply with button click
5. **Cut fifth:** 3D graph → replace with a 2D force-directed graph using `react-force-graph-2d` (much simpler)

### Things that MUST work for the demo:
- Drafting an article in the editor
- Entering editorial review and seeing blocks + review flags
- At least 2 flag interaction types working (grammar + source search)
- Polish button producing a rewritten article
- 3D (or 2D) graph rendering with article/user nodes
- Search returning ranked results
- Clicking an article to read it

---

## Data Requirements

### Demo Articles (5 minimum, prepared pre-hackathon)
Need realistic journalism articles spanning different topics for the demo. Ideally:
- 2 articles on a politically divisive topic (to show counter-argument feature)
- 1 article with intentional grammar/spelling errors (to show grammar review)
- 1 article with unsourced claims (to show source search)
- 1 well-written article (to show "clean" editorial review)

### Demo Users
- 1 primary demo user (the "journalist" using the editorial review)
    - can use user_id: 0x21f743986ae500907ade6dc4a34cbe40c2c43e3f
- Pre-populate with ideological embedding positioned near some articles but far from others

### Graph Data Export
From Neo4j, export:
```cypher
MATCH (u:User)-[r]->(a:Article)
RETURN u.id, u.alias, type(r) as relationship, a.id, a.title, a.preview, a.postTime
```
Clean and format as JSON for the seed script.

---

## Environment Variables

```env
# Claude API
ANTHROPIC_API_KEY=

# Redis
REDIS_URL=

# Embeddings (for generating contextual embeddings at search time)
OPENAI_API_KEY=        # if using OpenAI embeddings

# Optional
EXA_API_KEY=           # only if adding Exa search
NEXT_PUBLIC_DEMO_USER_ID=  # hardcoded demo user for presentation
```

---

## Prompt Templates (Draft — Refine During Build)

### Block Decomposition System Prompt
```
You are an expert editorial analyst for an independent journalism platform.
Given an article, decompose it into atomic "building blocks." Each block
should represent ONE cohesive idea, argument, or narrative beat.

Rules:
- Each block should be independently understandable when read with its summary
- Blocks should follow the article's natural flow
- A typical article has 5-12 blocks
- Include the exact text boundaries (start/end character offsets) for each block

Return valid JSON matching this schema:
{
  "topic_summary": "One-sentence summary of the article's central topic",
  "key_arguments": ["Main argument 1", "Main argument 2", ...],
  "blocks": [
    {
      "id": "block_1",
      "summary": "2-3 sentence semantic summary of this block's idea",
      "start_offset": 0,
      "end_offset": 450,
      "text_content": "Exact text of this block from the article"
    }
  ]
}
```

### Block Review System Prompt
```
You are an expert editor reviewing a building block of a journalism article.

FULL ARTICLE CONTEXT:
{article_text}

BLOCK BEING REVIEWED (Block {block_number} of {total_blocks}):
{block_text}

Review this block for ONLY these categories. Only include a flag if there
is a genuine issue — do not flag things that are fine.

1. GRAMMAR/SPELLING: Specific errors with corrections
2. NEEDS_SOURCE: Claims that would be stronger with citations
3. COUNTER_ARGUMENT: Arguments that would benefit from acknowledging opposing views
4. REDUNDANT: Content that overlaps significantly with another block
5. REORDER: This block would serve the article better in a different position

Return valid JSON:
{
  "block_id": "{block_id}",
  "flags": [
    {
      "type": "grammar|needs_source|counter_argument|redundant|reorder",
      "detail": "Explanation for the author",
      "correction": "For grammar only: the corrected text",
      "claim_text": "For needs_source only: the specific claim",
      "topic": "For counter_argument only: the opposing viewpoint topic",
      "overlaps_with": "For redundant only: the other block ID",
      "suggested_position": 2  // For reorder only: suggested block index
    }
  ]
}
```

### Polish System Prompt
```
You are a skilled editor who preserves authorial voice. Below is an article
that has been restructured into blocks by its author. Your ONLY job is to
ensure the blocks flow smoothly together as a cohesive article.

AUTHOR'S WRITING STYLE SAMPLES:
{previous_articles_by_author}

RESTRUCTURED ARTICLE BLOCKS (in final order):
{blocks_in_order}

Rules:
- Make MINIMAL edits — only add/modify transition sentences between blocks
- PRESERVE the author's vocabulary, sentence structure, and tone
- Do NOT add new arguments, facts, or opinions
- Do NOT restructure beyond the given block order
- Do NOT change any quoted material
- Output the complete article text, ready to publish
```

### Styling

- Font
  - Buttons/Interface: Montserrat (tailwind class font-sans)
  - Articles, body text, previews, etc.: Source Serif 4 (tailwind class font-serif)
- Theme
  - Dark mode primary
    - bg: zinc-800
    - text: stone-100
    - highlights:
      - cyan-500 (hyperlinks, primary highlight)
      - amber-500 (secondary)
      - teal-500
  - Light mode
    - bg: stone-800
    - text: zinc-800
- Misc
  - rounded-md
  - hover effects on buttons darken buttons
  - no shadows
