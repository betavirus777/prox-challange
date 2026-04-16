# Vulcan OmniPro 220 — AI Welding Assistant

A multimodal reasoning agent for the Vulcan OmniPro 220 multiprocess welder. Ask technical questions about setup, specifications, troubleshooting, and welding technique. Get answers with exact source citations and interactive visual artifacts.

![Vulcan OmniPro 220](product.webp)

## Quick Start

```bash
git clone <your-fork>
cd <your-fork>
cp .env.example .env          # add your ANTHROPIC_API_KEY
npm install
npm run dev                    # open http://localhost:3000
```

One API key. One command. Running in under 2 minutes.

---

## What This Agent Does

The challenge requires an agent that answers questions like:

> "What's the duty cycle for MIG welding at 200A on 240V?"

The agent reads the full 48-page owner's manual, quick start guide, and selection chart as native PDF documents using Claude's vision capabilities. It doesn't chunk, embed, or preprocess — Claude sees the actual pages, including diagrams, tables, and schematics. Every answer includes **page-level citations** via Anthropic's Citations API so you can verify against your physical manual.

> "Show me the polarity setup for TIG welding. Which socket does the ground clamp go in?"

Instead of describing it in text, the agent generates an **SVG polarity diagram** showing which cable goes in which socket, rendered in a split-pane artifact panel. For complex questions it generates interactive React components (duty cycle calculators, settings configurators) or Mermaid flowcharts (troubleshooting decision trees).

> "I'm getting porosity in my flux-cored welds. What should I check?"

The agent uses its `troubleshoot` tool for structured lookup, then supplements with the full manual context. It knows porosity causes range from gas coverage issues to contaminated base metal, and provides the solutions in order of likelihood — with citations to the troubleshooting section of the manual.

---

## Architecture & Design Decisions

### Why the Anthropic SDK directly (not a framework)

The challenge requires "the Anthropic Claude Agent SDK as the foundation." The chat route uses `@anthropic-ai/sdk` with `client.messages.stream()` and a manual agentic loop — no framework abstraction. This gives us direct control over:

- **Streaming**: Custom SSE protocol sends text, citations, and tool status to the frontend in real-time
- **Citations**: Native Anthropic Citations API with `citations: { enabled: true }` on each PDF document block
- **Tool loop**: Up to 5 tool iterations per query with structured tool results fed back into the conversation
- **Prompt caching**: `cache_control: { type: "ephemeral" }` on PDF document blocks so subsequent requests reuse cached context (~90% cost reduction on document tokens)

### Why PDFs as native documents (not RAG)

Traditional approaches would chunk the PDFs, embed them in a vector store, and retrieve relevant chunks. We skip all of that:

1. **Claude reads the PDFs directly** via its native PDF/vision support. The full documents are sent as `type: "document"` content blocks with `source.type: "base64"`. Claude sees the actual pages — text, tables, diagrams, schematics.

2. **Citations are automatic**. With `citations.enabled: true`, Claude's responses include `page_location` citations that reference exact page numbers. No post-processing needed.

3. **No information loss**. RAG systems can miss information that falls between chunks or exists only in visual content. By sending full documents, Claude has access to everything.

The tradeoff is higher per-request token cost (~10MB of PDFs), but prompt caching makes this practical — the first request pays full price, subsequent requests in the same session use the cache.

### Why custom tools alongside full documents

Even though Claude can read the PDFs directly, structured tool lookups are faster and more reliable for specific data queries:

| Tool | Purpose | Data Source |
|------|---------|-------------|
| `search_manual` | Full-text search across extracted sections | `knowledge/sections/*.json` |
| `lookup_duty_cycle` | Structured duty cycle table lookup | `knowledge/duty-cycles.json` |
| `lookup_specs` | Specs, polarity, settings, wire feed, parts | `knowledge/*.json` |
| `get_manual_image` | Find specific diagrams/schematics | `knowledge/image-index.json` |
| `troubleshoot` | Structured troubleshooting lookup | `knowledge/troubleshooting.json` |

Claude decides when to use tools vs. when to read from the PDFs directly. For "what's the duty cycle at 200A on 240V?", it calls `lookup_duty_cycle` for a precise structured answer. For "explain how the synergic control system works", it reads from the PDF.

### Why interactive artifacts (not just text)

The challenge says: "When something is too cognitively hard to explain in words, the agent should draw it." The system prompt instructs Claude to generate artifacts using the `<antArtifact>` XML format, which the frontend parses and renders:

- **React components** via Sandpack (duty cycle calculators, settings configurators, comparison tables)
- **SVG diagrams** for polarity/cable routing (rendered natively)
- **Mermaid flowcharts** for troubleshooting decision trees
- **HTML pages** via sandboxed iframe for complex layouts

The artifact panel opens beside the chat in a split-pane layout, similar to Claude's own artifact UI.

### Multi-model extraction pipeline (optional)

For the pre-populated knowledge base, we built a 3-stage extraction pipeline:

1. **Stage 1**: Parallel extraction — sends each PDF to Claude, GPT-4o, and Gemini simultaneously
2. **Stage 2**: Cross-model review — Claude compares all extractions, identifies discrepancies, assigns confidence scores
3. **Stage 3**: Structuring — converts reviewed data into tool-optimized JSON files

This pipeline is optional. The agent works without running it because Claude reads PDFs directly. But running extraction creates the structured data files that make tool lookups precise and fast.

### Voice mode (optional, requires ElevenLabs)

For the "hands-free in the garage" use case, there's a full-duplex voice mode using ElevenLabs' Conversational AI SDK. The voice agent uses a condensed system prompt optimized for spoken responses (no markdown, short sentences, spoken numbers). It connects to the same knowledge base through server tool webhooks.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Anthropic SDK streaming + agentic tool loop
│   │   └── tools/                     # Server tool webhooks for ElevenLabs voice mode
│   ├── layout.tsx, page.tsx, globals.css
├── components/
│   ├── chat/                          # ChatWindow, MessageBubble, MessageInput, StarterQuestions
│   ├── artifacts/                     # ReactArtifact (Sandpack), SvgArtifact, MermaidArtifact, HtmlArtifact
│   ├── citations/                     # CitationBadge, CitationPanel (PDF page viewer, YouTube embed)
│   └── voice/                         # VoiceAgent (ElevenLabs full-duplex)
├── lib/
│   ├── tools.ts                       # 5 tool definitions + executors
│   ├── system-prompt.ts               # Prompts for text mode (with artifacts) and voice mode
│   ├── use-agent-chat.ts              # Custom React hook for SSE streaming
│   ├── files.ts                       # PDF loading
│   ├── search.ts                      # TF-IDF search over extracted sections
│   ├── parse-artifacts.ts             # antArtifact XML parser
│   └── parse-citations.ts            # Citation resolver (PDF pages, video timestamps)
scripts/                               # Extraction pipeline (optional)
knowledge/                             # Pre-populated structured data
files/                                 # Source PDFs (owner-manual, quick-start-guide, selection-chart)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | The only key needed to run the agent |
| `ELEVENLABS_API_KEY` | No | Voice mode (optional) |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | No | Voice mode agent ID (optional) |
| `OPENAI_API_KEY` | No | Extraction scripts only |
| `GOOGLE_AI_API_KEY` | No | Extraction scripts only |

## Deployment

**Railway** (recommended — always-on, no function timeouts):
```bash
railway up    # Dockerfile handles everything
```

**Vercel** (fallback — 120s function timeout configured):
```bash
vercel deploy
```

## Tech Stack

- **Claude Sonnet 4.5** via `@anthropic-ai/sdk` — streaming, tool use, citations, prompt caching
- **Next.js 15** — App Router, Turbopack, standalone output for Docker
- **Sandpack** — sandboxed React artifact rendering
- **Mermaid** — flowchart/diagram rendering
- **ElevenLabs** — full-duplex conversational voice (optional)
- **Tailwind CSS v4** — styling
- **TypeScript** — end-to-end type safety
# prox-challange
