# Evidence quality and scoring plan (planned, not built)

Owner request, 2026-11-14: score every layer against recognised best practice, and make each layer feed real, usable facts into the next so insights, direction, copy and first-pass production rest on weighty evidence, not on many small searches.

Status: PLANNED, decisions made. Nothing here is implemented beyond CHG-0055. Current state: reviewers give a 0 to 100 relevance score (CHG-0055) with a lexical invented-figure check; research is four segment searches steered by the scope.

## Frameworks to base the scoring on (to confirm with the owner)
- **Source grading:** the Admiralty (NATO) code, which rates the source's reliability (A to F) separately from the information's credibility (1 to 6), so a good site saying something unlikely is not over-trusted.
- **Source tests:** CRAAP (currency, relevance, authority, accuracy, purpose) for each source, with recency limits per claim type.
- **Triangulation:** a finding is "strong" only with two or more independent sources; one source is "single-source" and capped.
- **Analytic standards:** intelligence-community tradecraft (ICD 203): separate fact from assumption from judgement, state confidence in words tied to evidence, consider alternative explanations.
- **Evidence rating:** a GRADE-style rating (high, moderate, low, very low) per insight from source quality, consistency, directness and recency.

## Layer by layer
1. **Scope:** question sets chosen by business type from a best-practice library (brand: proposition, proof, positioning; customer: segments, jobs to be done, pains, customer language, channels; competitor: set, positioning, pricing, share of voice; creative: category codes and channel formats). Score: fit to the brief, specificity, answerability from public sources, coverage of the library.
2. **Research:** each researcher returns structured facts (claim, figure, unit, date, source, quote) not prose. Score per source (reliability and credibility grades, recency, directness) and per segment (coverage of its questions, number of independent sources, share of quantified facts).
3. **Source review:** applies the grades above and fixes the score; a segment below a minimum evidence score triggers targeted follow-up research on the missing questions, not a pass.
4. **Insights:** each insight lists supporting facts, counter-evidence and an alternative explanation, and gets an evidence rating. Score: traceability, triangulation, directness, confidence fit.
5. **Direction:** weighted by the insights it uses; shows its weakest link (lowest evidence rating among the claims it relies on). Score: coverage of the objective, claim support, consistency with do-not-claim.
6. **Copy pack:** every claim traced to a fact and carries that fact's evidence rating; unsupported lines are blocked. Score: claim-to-evidence trace, tone fit, channel fit.
7. **First-pass production:** frames and copy checked against the copy pack (fidelity), then handed to the human reviewer with an evidence summary beside each asset.

## Cross-cutting
- An evidence-strength index that flows forward and is shown at each approval, so a person sees the weakest link before approving.
- Optional first-party data from the customer (analytics, sales, reviews) as the highest-grade input.
- Score thresholds and weights editable in the admin portal, with the framework named beside each score.
- Calibrate against a small set of human-graded examples before trusting thresholds.

## Owner decisions (2026-11-14)
1. Named standard: Admiralty source grading, CRAAP source tests and a GRADE-style evidence rating.
2. First-party customer data upload: wanted at some point, not now.
3. Weak evidence warns the people involved. When weak evidence is found at an AI producer gate, the producer re-triggers the associated AI agent (scoping, researcher, insight drafter or direction drafter) with clearer guidance and rules built from what it found, within the existing one-rework limit, and holds for a person if it is still weak.
   - Today this exists for insights and direction (one redraft with the producer's notes, then a hold). It does not yet exist for scope, research or sources: those stop at a hold or pass.

## Built (CHG-0058)
Source grades (Admiralty and CRAAP), segment and insight ratings, producer-only display, free rejection of very weak sources and insights, one research re-run per weak segment with guidance, and non-blocking warnings.

## Still to build
Structured facts from researchers, Admiralty and CRAAP grades per source, evidence rating per insight, the carried-forward evidence-strength index, research re-runs on weak segments with targeted guidance, and the portal controls for weights and thresholds.

## Open questions for the owner (answered above; kept for history)
- Which frameworks to adopt as the named standard (suggested: Admiralty plus CRAAP plus GRADE-style rating).
- Whether first-party customer data upload is in scope.
- Minimum evidence score to pass each gate, and whether low evidence should block or only warn.
