require("tsx/cjs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { mkdirSync, existsSync } = require("node:fs");
const { createProject, transition, projectView } = require("../src/lib/factory/engine.ts");

(async () => {
  const principal = { subject: "producer-fixture", email: "producer@example.test", role: "operator", identity: "firebase", workspaceId: "acct_fixture", accountId: "acct_fixture" };
  let project = createProject({ business: "Task planning fixture", objective: "Create static artwork for an email campaign", workRequest: "campaign", requestedFormats: ["static"], contact: "a@example.test" }, principal, "task-fixture");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined), headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/factory/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname.split("/api/factory/")[1];
      let body = {};
      if (path === "session") body = { principal, config: { storage: "Test fixture", demoEnabled: true, synthesisReady: false, researchReady: false } };
      else if (path === "accounts") body = { accounts: [] };
      else if (path === "projects") body = { projects: [projectView(project, principal)] };
      else if (path === "projects/task-fixture") {
        if (request.method() === "POST") project = transition(project, request.postDataJSON(), principal);
        body = { project: projectView(project, principal) };
      }
      await route.fulfill({ json: body });
    });
    await page.goto((process.env.PORT67_TEST_ORIGIN || "http://localhost:3000") + "/portal");
    const panel = page.getByRole("region", { name: "Project task plan", exact: true });
    await panel.getByText("Plan version 1", { exact: false }).waitFor();
    assert.equal(await panel.getByRole("row").count(), project.taskPlan.tasks.length + 1);
    await panel.getByText("Choose relevant research agents", { exact: true }).click();
    const video = panel.getByRole("checkbox", { name: /^Video research/ });
    assert.equal(await video.isChecked(), false);
    await video.check();
    await panel.getByLabel("Reason for this selection").fill("Producer adds video references for this customer's requested comparison.");
    await panel.getByRole("button", { name: "Save agent selection", exact: true }).click();
    await panel.getByText("Plan version 2", { exact: false }).waitFor();
    assert.ok(project.taskPlan.research.includes("video"));
    assert.equal(project.taskPlan.history.length, 1);
    mkdirSync("work/screenshots", { recursive: true });
    await page.screenshot({ path: "work/screenshots/task-plan-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: "work/screenshots/task-plan-mobile.png", fullPage: true });
    assert.deepEqual(errors, []);
    console.log("Task plan browser fixture: task board, relevant-agent selection, versioned save, history and desktop/mobile rendering passed");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
