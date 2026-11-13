# Research runbook: pushing the account owner's content through the agents

Purpose: run the real jpell@me.com account owner project through the four research agents, then inspect where data flowed, where it was blocked and what it cost, before any drafting, rendering or production.

## Before you start (Render, once)

1. Keys set for the providers you want (PORT67_OPENAI_API_KEY and/or PORT67_GEMINI_API_KEY; research uses OpenAI or Gemini only).
2. PORT67_RESEARCH_ENABLED=true and PORT67_SYNTHESIS_ENABLED=true.
3. For hands-off testing add PORT67_AUTO_APPROVE_PRODUCER=true. Remove it to put a Port67 producer back in the loop.
4. Optional: PORT67_SESSION_SECRET rotated (it was exposed earlier).

## Choose models and prices (admin, jed@port67.ai)

1. AI agents tab, click Apply suggested setup, or Change model on each research agent.
2. For every chosen model use Fetch public price, add the search fee by hand, Save. Without prices a call holds $1 of the $25 cap.
3. Confirm the system map shows a model on each research agent and no "No model chosen yet".

## Prepare (account owner, jpell@me.com)

1. Open the project and the Business brief. Fill: business name, objective, a description of at least two sentences, website, audience, named competitors, inspiration.
2. Research room: choose launch channels (up to five).
3. Read Research preparation. Required items must be green. Recommended items turn into stated assumptions if left empty. Check the questions each agent will be asked.

## Run

1. Click Request research. With auto-approve on, the four agents start within seconds; otherwise a producer authorises and clicks Start research.
2. Watch the Research room flow and, as admin, the system map: connectors animate while a call runs, and amber gates show what is waiting.

## Inspect (admin)

1. AI agents tab: "Where data is blocked or not flowing" lists every blocker and failure with its cause.
2. Cost by model: which model is expensive, how many calls failed, average time.
3. Recent calls: each call with provider, model, tokens, cost.

## Review (producer)

1. Gate 1: review every source and mark it supported or rejected.
2. Download the Research dossier (.md) and read findings, confidence and gaps. This is the research output before any insight, strategy or visual is produced.
3. Only then draft insights (Gate 2), and so on through the journey.

## What good looks like

- Each research agent returns cited findings with their own URLs, plus gaps and confidence.
- No agent shows red (failed or unknown) on the map; if one does, check the call in Recent calls and the provider billing before retrying.
- Total cost for four research calls is on the order of a few cents per call at mini-tier prices.
