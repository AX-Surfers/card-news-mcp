---
name: cardnews-research
description: Use when starting a card-news piece - gathers and synthesizes source material for a given topic into structured research notes. Step 1 of the card-news pipeline.
---

# Card News — Research (Step 1)

Gather source material for a card-news topic and distill it into structured notes
the copy step can build on.

## Inputs
- **topic** (required): subject of the card news
- **angle** (optional): desired framing, audience, or tone

## Procedure

1. Run web research on the topic:
   - Use WebSearch for recent, authoritative sources.
   - Use WebFetch to pull key articles and extract concrete facts, numbers, quotes.
   - Prefer primary sources; note publication dates.
2. Synthesize into research notes:
   - **Core message** — one sentence the card news must land.
   - **Key points** — 3–7 bullet facts, each with a source.
   - **Hook** — the most surprising/compelling angle for the thumbnail.
   - **CTA idea** — what the reader should do/feel at the end.
3. Flag gaps: anything you could not verify, so copy doesn't invent it.

## Output

A research-notes block (markdown). Hand it to **cardnews-copy**. Do not write
final card copy here — that belongs to the next step where it is schema- and
lint-gated.
