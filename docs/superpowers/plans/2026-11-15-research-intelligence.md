# Research Intelligence Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; owner explicitly authorised unattended execution.

**Goal:** Add adjacent-business, trend and video research and carry evidenced creative learning into production.
**Architecture:** Extend existing typed research bus, metered provider gateway and review/approval flow. Preserve bounded calls and old record compatibility.
**Tech Stack:** Next.js, TypeScript, Firebase adapters, existing OpenAI/Gemini providers.
**Spec:** docs/superpowers/specs/2026-11-15-research-intelligence-design.md

## Global Constraints
All paid calls use existing metering. Server-derived account scope. No private source data or keys in logs. No silent approval or invented engagement/visual observations.

## Review Focus
- Old scopes/directions remain usable without hash changes.
- Additional sources reach synthesis rather than being truncated after old segments.
- Direct video is supported only on validated public YouTube URLs and Gemini.
- Changed channels/scope invalidate in-flight context.
- New agents appear in routing, progress, review and map with cost attribution.

## Tasks
- [x] 1. RED: test seven-role scope/plan and video provenance. GREEN: shared role catalog, scope compatibility, context fingerprint and strict video-analysis contract.
- [x] 2. RED: provider request test. GREEN: metered direct-video path, source provenance, grounded source matching and isolated research payloads.
- [x] 3. GREEN: routing, UI research bus, producer checks and balanced synthesis; carry approved video treatment through content and advert prompts. Test no unreviewed evidence escapes.
- [x] 4. Run full suite, lint, types, build, browser checks where available; update requirements, status, handover and test guide; governance and independent final review; commit and prepare PR.

## Execution evidence
Full npm test, Factory lint, types, build and desktop/mobile browser acceptance passed. Native YouTube API tests use explicit transport fixtures. Firestore emulator locally blocked at JAR download; remote CI remains required. Independent reviewer reported legacy automatic scope expansion; a RED→GREEN regression test now preserves manual old scopes on ordinary retries. New research citation matching preserves video IDs and meaningful query parameters. No live provider or production deployment claimed.
