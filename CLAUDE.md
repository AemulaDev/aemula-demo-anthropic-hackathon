# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Next.js)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test framework is configured yet.

## Project Overview

This is a hackathon demo for **Aemula**, a decentralized independent journalism platform. It's a **two-tab Next.js app** built for the Generative Interfaces × Claude Hackathon.

**Tab 1: Agentic Editorial Review** — AI-orchestrated block-based article editing workflow
**Tab 2: Ideological Vector Search** — 3D visualization of ideological proximity in article space

## Architecture

```
Next.js (App Router) + Tailwind CSS → Vercel
API Routes → Claude API + Redis
Redis → Vector store (ideological + contextual embeddings) + article JSON storage
```

**API route structure to build:**
- `/api/editorial/*` — Claude API calls for block decomposition and review
- `/api/chat` — Cmd+K chat endpoint (Claude Haiku)
- `/api/search/articles` — Redis vector queries (contextual + ideological ranking)
- `/api/articles/*` — Article CRUD (Redis)

## Claude Model Routing

| Task | Model |
|------|-------|
| Cmd+K inline chat | `claude-haiku-4-5-20251001` |
| Block decomposition | `claude-sonnet-4-6` |
| Block review (parallelized per block) | `claude-sonnet-4-6` |
| Source search | `claude-haiku-4-5-20251001` + web search tool |
| Polish/rewrite (voice matching) | `claude-opus-4-6` |

## Key Dependencies to Install

- `@anthropic-ai/sdk` — Claude API
- `redis` / `@redis/client` — Redis client
- `@milkdown/crepe` — Rich text editor
- `react-force-graph-3d` — 3D graph visualization
- `@dnd-kit/core` + `@dnd-kit/sortable` — Drag-and-drop block reordering
- `framer-motion` — Morphing transitions for vector search view
- `three` — Peer dependency for react-force-graph-3d

## Environment Variables

```env
ANTHROPIC_API_KEY=
REDIS_URL=
OPENAI_API_KEY=          # for generating contextual embeddings at search time
EXA_API_KEY=             # optional, for Exa source search
NEXT_PUBLIC_DEMO_USER_ID=  # hardcoded demo user (0x21f743986ae500907ade6dc4a34cbe40c2c43e3f)
```

## Redis Data Schema

```
# Article storage
HASH article:{id} → { title, subtitle, author_id, content, created_at }

# Vector indexes
VECTOR INDEX idx:ideological → article:{id}:ideo_vec, user:{id}:ideo_vec (128d, COSINE)
VECTOR INDEX idx:contextual  → article:{id}:ctx_vec (1024d or 1536d, COSINE)

# Pre-computed 3D positions (for graph visualization, computed offline)
article:{id} also stores { x, y, z } for graph layout
```

## Editorial Review Flow (4 States)

1. **DRAFTING** — Milkdown/Crepe editor with Cmd+K chat overlay
2. **LOADING** — Progress indicator while Claude analyzes article
3. **BLOCK EDITOR** — Two-column: draggable blocks (left) + review flags (right)
4. **POLISHED ARTICLE** — Rewritten article in editor with Publish button

Claude API call sequence: Block Decomposition (Sonnet) → Block Review parallelized per block (Sonnet) → [user-triggered] Source Search (Haiku) → Counter-Argument Search (Redis) → Polish (Opus)

## Ideological Vector Search Flow (3 States)

1. **DEFAULT 3D VIEW** — All nodes (users + articles) in ideological space. Colors: current user = cyan `#06B6D4`, articles = amber `#F59E0B`, other users = light grey `#D1D5DB`
2. **CONTEXTUAL HIGHLIGHT** — Relevant articles highlighted/pulsing after search
3. **IDEOLOGICAL RANKING** — Nodes morph to vertical list ordered by cosine similarity to current user's ideological vector

**Search pipeline:** Embed query → KNN on `idx:contextual` (top 20) → compute cosine similarity against user's `idx:ideological` vector → rank by proximity.

## Scope Priority

If time-constrained, cut in this order: morph animation → counter-argument Redis search → Cmd+K in polished view → block drag-and-drop → 3D graph (fall back to 2D with `react-force-graph-2d`).

**Must work for demo:** article drafting, editorial review with blocks + flags, polish rewrite, 3D/2D graph render, search with ranked results, click-to-read article.
