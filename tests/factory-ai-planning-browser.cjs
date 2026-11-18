require("tsx/cjs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { existsSync, mkdirSync } = require("node:fs");
const { createProject, transition, projectView, scopeHash } = require("../src/lib/factory/engine.ts");
const { segments } = require("../src/lib/factory/model.ts");
const { planningInputKey, planningScopeKey, researchTaskKey, mediumEvidenceKey } = require("../src/lib/factory/planning-context.ts");
const { planProject } = require("../src/lib/factory/task-plan.ts");
const { templateScope } = require("../src/lib/factory/scope.ts");
const { prepareMediumSelection, validateMediumSelection } = require("../src/lib/factory/medium-selection.ts");

(async () => {
  const principal = { subject: "producer-fixture", email: "producer@example.test", role: "operator", identity: "firebase", workspaceId: "acct_fixture", accountId: "acct_fixture" };
  let p = createProject({ business: "AI planning fixture", objective: "Explain a repairable product to new buyers", workRequest: "campaign", requestedFormats: ["static"], contact: "a@example.test", useAIPlanner: true }, principal, "planning-fixture");
  p = transition(p, { type: "setChannels", channels: ["instagram"] }, principal);
  p = transition(p, { type: "authoriseAI", confirm: true }, principal);
  p.researchPlanning = { enabled: true, status: "completed", inputKey: planningInputKey(p), version: 1, history: [], proposal: { summary: "Research product proof and customer purchase barriers", unknowns: ["No measured campaign history"], agents: segments.map(segment => ({ segment, selected: ["brand", "customer"].includes(segment), reason: "Focus the evidence on this campaign objective", questions: ["What substantiates the product offer?", "What evidence explains buyer hesitation?"], sourceTypes: ["Public primary sources"], methods: [], avoid: ["Unverified performance claims"], maxPages: 6 })), mediumHypotheses: [{ channel: "instagram", format: "video_short", reason: "Consider a visual product explanation", confidence: "limited", basis: "channel_prior" }], gaps: [{ name: "Offer economics", reason: "Margin data is unavailable", existingCapabilityLimit: "Public research cannot establish internal margins", requiredInputs: ["Authorised client information"] }] } };
  planProject(p, principal.subject, "Validated AI planning fixture");
  p.scope = templateScope(p, { briefHash: scopeHash(p), version: 1 }); p.scope.planningVersion = 1; p.scope.planningKey = planningScopeKey(p);
  for (const segment of p.taskPlan.research) p.runs.push({ id: segment, stage: "research", segment, at: "2026-11-16", status: "completed", provider: "fixture", model: "fixture", taskInputKey: p.taskPlan.researchKey, researchTaskKey: researchTaskKey(p, segment) });
  p.sources.push({ id: "s", segment: "customer", title: "Customer evidence fixture", url: "https://example.com/evidence", excerpt: "Visual examples help buyers understand the repairable offer", kind: "public_source", status: "supported", collectedAt: "2026-11-16", method: "fixture" });
  p.insights.push({ id: "i", title: "Visual explanation", interpretation: "Test visual explanation of the offer", sourceIds: ["s"], confidence: "limited", status: "reviewed", createdAt: "2026-11-16" });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.route("**/api/factory/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname.split("/api/factory/")[1];
      let data = {};
      if (path === "session") data = { principal, config: { storage: "Test fixture", synthesisReady: true, researchReady: true, demoEnabled: true } };
      else if (path === "accounts") data = { accounts: [] };
      else if (path === "projects") data = { projects: [projectView(p, principal)] };
      else if (path === "projects/planning-fixture/planning") {
        const body = request.postDataJSON();
        if (body.kind === "research") {
          p.researchPlanning = { ...p.researchPlanning, status: "completed", inputKey: planningInputKey(p), version: p.researchPlanning.version + 1, proposal: { ...p.researchPlanning.proposal, performanceIds: p.performance.filter(r => r.status === "accepted").map(r => r.id) } }; planProject(p, principal.subject, "Replanned with performance observations"); p.revision++;
          await route.fulfill({ json: { project: projectView(p, principal) } }); return;
        }
        assert.equal(body.kind, "medium");
        const proposal = validateMediumSelection({ summary: "Compare the requested static artwork with a video explanation", recommendations: [{ channel: "instagram", format: "video_short", score: 8, confidence: "moderate", basis: "evidence", sourceIds: ["s"], insightIds: ["i"], reason: "Reviewed customer evidence supports visual explanation", counterargument: "Static artwork may explain the offer sufficiently", uncertainties: ["No measured performance data is connected"] }], gaps: [] }, prepareMediumSelection(p));
        const history = prepareMediumSelection(p).payload.historicalPerformance;
        if (history.length) { proposal.recommendations[0] = { ...proposal.recommendations[0], format: "static", basis: "observed_performance", performanceIds: [history[0].id] }; validateMediumSelection(proposal, prepareMediumSelection(p)); }
        p.mediumSelection = { status: "completed", version: (p.mediumSelection?.version || 0) + 1, evidenceKey: mediumEvidenceKey(p), proposal, history: [] }; p.revision++;
        data = { project: projectView(p, principal) };
      } else if (path === "projects/planning-fixture") {
        if (request.method() === "POST") p = transition(p, request.postDataJSON(), principal);
        data = { project: projectView(p, principal) };
      }
      await route.fulfill({ json: data });
    });
    await page.goto((process.env.PORT67_TEST_ORIGIN || "http://localhost:3000") + "/portal");
    await page.getByRole("heading", { name: "AI research planning", exact: true }).waitFor();
    await page.getByText("Provisional medium hypotheses", { exact: true }).click();
    await page.getByText("Selective catalogue expansion proposals", { exact: true }).click();
    await page.getByText("They cannot launch agents or grant tools.", { exact: false }).waitFor();
    await page.getByRole("button", { name: "Campaign direction", exact: true }).click();
    await page.getByRole("button", { name: "Recommend media from reviewed evidence · paid", exact: true }).click();
    const medium = page.getByRole("region", { name: "Evidence-backed medium selection", exact: true });
    await medium.getByText("Alternative to the requested deliverables.", { exact: true }).waitFor();
    await medium.getByText("Customer requested:", { exact: true }).waitFor();
    await page.getByRole("checkbox", { name: /^Static ad/ }).check();
    await page.getByLabel("Why these formats for this audience and channel?").fill("The customer wants a static pilot first; we will compare video later.");
    await page.getByRole("button", { name: "Confirm formats", exact: true }).click();
    await page.getByRole("button", { name: "Formats confirmed", exact: false }).waitFor();
    assert.deepEqual(p.brief.requestedFormats, ["static"]); assert.deepEqual(p.formats.selected, ["static"]); assert.equal(p.mediumDecision.recommendationVersion, 1);
    mkdirSync("work/screenshots", { recursive: true });
    await page.screenshot({ path: "work/screenshots/ai-medium-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    await page.screenshot({ path: "work/screenshots/ai-medium-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await page.getByRole("button", { name: "Open performance learning", exact: true }).click();
    const feedback = page.getByRole("region", { name: "Campaign performance feedback" });
    await feedback.getByText("Record campaign results", { exact: true }).click();
    const entry = feedback.locator("details").nth(0);
    for (const [name, value] of Object.entries({ campaign: "Pilot report", objective: "Purchases", audience: "UK buyers", offer: "Repairable product", provenance: "Account report export", attribution: "Seven day click, observational", start: "2026-10-01", end: "2026-10-31", currency: "GBP", impressions: "1000", clicks: "50", conversions: "5", spend: "100", revenue: "250" })) await entry.locator(`[name=${name}]`).fill(value);
    await entry.locator("[name=channel]").selectOption("instagram");
    await entry.locator("[name=format]").selectOption("static");
    await entry.locator("[name=publicAuthorised]").check();
    await entry.getByRole("button", { name: "Record results for review", exact: true }).click();
    const record = feedback.locator("article").first();
    await record.getByText("Pilot report · instagram / static", { exact: true }).waitFor();
    assert.equal(p.performance[0].status, "pending");
    await record.locator("[name=reason]").fill("Report checked; audience and attribution need a comparable test");
    await record.getByRole("button", { name: "Save result review", exact: true }).click();
    await record.locator("p").filter({ hasText: "· accepted ·" }).waitFor();
    assert.equal(p.performance[0].status, "accepted");
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await page.getByRole("button", { name: "Plan research with AI · paid", exact: true }).click();
    await page.getByRole("button", { name: "Open performance learning", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "work/screenshots/performance-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.getByRole("button", { name: "Campaign direction", exact: true }).click();
    await page.getByRole("button", { name: "Recommend media from reviewed evidence · paid", exact: true }).click();
    await medium.getByText("Observed performance", { exact: false }).first().waitFor();
    assert.deepEqual(p.mediumSelection.proposal.recommendations[0].performanceIds, [p.performance[0].id]);
    assert.deepEqual(errors, []);
    console.log("AI medium browser fixture: planner hypotheses, capability gaps, evidence alternatives, versioned producer confirmation and unchanged customer request passed");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
