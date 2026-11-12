const { chromium } = require("playwright");
const assert = require("node:assert/strict");
require("node:fs").mkdirSync("work/screenshots", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    (process.env.PORT67_TEST_ORIGIN || "http://localhost:3000") + "/portal",
  );
  await page.getByRole("button", { name: "Explore the demo" }).click();
  assert.equal(await page.getByRole("button",{name:"Private API costs",exact:true}).count(),0);
  await page
    .getByRole("heading", { name: "Good work starts with understanding." })
    .waitFor();
  await page.screenshot({
    path: "work/screenshots/portal-overview.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Campaign direction", exact: true })
    .click();
  await page
    .getByLabel("Campaign message")
    .fill("Make room for everyday adventure");
  await page
    .getByLabel("Research reasoning")
    .fill(
      "The synthetic customer insight suggests approachability matters. Use everyday situations and a calm invitation; validate this hypothesis with real customers before campaign use.",
    );
  await page
    .getByLabel("Visual and design direction")
    .fill(
      "Warm brand orange, generous space and calm typography. Clear, readable motion.",
    );
  await page
    .getByLabel("Recommended channels")
    .fill("Instagram concept; validate audience/channel fit");
  await page
    .getByLabel("What are we testing?")
    .fill(
      "An everyday-adventure message may be more approachable than extreme-performance claims.",
    );
  await page.getByRole("button", { name: "Save direction draft" }).click();
  await page
    .getByRole("button", { name: "Share direction", exact: true })
    .click();
  await page.getByRole("button", { name: "View as customer" }).click();
  await page
    .getByRole("button", { name: "Approve direction", exact: true })
    .click();
  await page
    .getByText("Direction approved. Port67 can now start production.")
    .waitFor();
  await page.screenshot({
    path: "work/screenshots/portal-direction.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to producer" }).click();
  await page.getByRole("button", { name: "Production", exact: true }).click();
  await page.getByRole("button", { name: "Create production drafts" }).click();
  await page
    .getByText("Three production briefs and creative drafts created.")
    .waitFor();
  await page
    .getByRole("button", { name: "Asset library", exact: false })
    .first()
    .click();
  await page.screenshot({
    path: "work/screenshots/portal-assets.png",
    fullPage: true,
  });
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Share for review", exact: true })
      .first()
      .click();
    await page.getByText("Asset shared for customer review").waitFor();
  }
  await page.getByRole("button", { name: "View as customer" }).click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "Approve asset", exact: true })
      .first()
      .click();
    await page.getByText("Asset approved for delivery").waitFor();
  }
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download", exact: true })
    .first()
    .click();
  const file = await download;
  assert.match(file.suggestedFilename(), /\.svg$/);
  await page
    .getByRole("button", { name: "Performance learning", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Learning starts with a clear hypothesis." })
    .waitFor();
  await page.getByRole("button", { name: "Back to producer" }).click();
  await page
    .getByRole("button", { name: "Workspace setup", exact: true })
    .click();
  await page.getByRole("heading", { name: "Configuration checks" }).waitFor();
  await page.getByText("PORT67_SESSION_SECRET", { exact: true }).waitFor();
  await page.screenshot({
    path: "work/screenshots/workspace-setup.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Research room", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Authorise public project data", exact: true })
    .click();
  await page
    .getByText(
      "Project brief authorised as PUBLIC data for the configured provider",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Draft insights with AI" })
      .isDisabled(),
    true,
    "synthetic demo cannot make paid drafting calls",
  );
  await page
    .getByRole("button", { name: "Revoke AI access", exact: true })
    .click();
  await page.getByText("AI authorisation revoked", { exact: true }).waitFor();
  await page.getByRole("button", { name: "View as customer" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "work/screenshots/portal-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "mobile horizontal overflow",
  );
  assert.notEqual(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).color),
    "rgb(255, 255, 255)",
    "light workspace headings must have dark contrast",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser workflow passed: research-backed direction, customer approval, production, 3 asset approvals, SVG download, learning, desktop/mobile.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
