import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandIntelView } from "../src/components/factory/BrandIntel";
import type { BrandIntelVersion } from "../src/lib/factory/model";
import { redLineCards } from "../src/components/factory/BrandIntel";

// Brand Intelligence panel (CHG-0108): submit button, versions, dossier, red lines, what was read.
const base: BrandIntelVersion = {
  id: "bi_1", customerId: "cust_x", version: 1, status: "completed", startedAt: "2026-11-25T10:00:00Z", startedBy: "p", finishedAt: "2026-11-25T10:04:00Z",
  sections: {
    "0": "Assumption [Reviews]", "1": "Gap [Website]", "6": "Cues [Reddit]",
    "7": "#### 7. Researched Red Lines\n##### The Anti-Persona\n* Not a chain bakery [Inference] [Reddit]\n##### Cultural and Aesthetic Taboos\n* No **neon** [Stated by the brand]\n##### Reputational and Regulatory Risks\n* Royal Warrant [Press]",
  },
  redLines: [{ category: "competitor", text: "Greggs", reason: "Legal dispute" }],
  intake: { name: "Nash", website: "https://n.example.com", socials: {}, purposeTextRead: false, knownForRead: true, filesNotRead: ["purpose.pdf"] },
  sources: [{ url: "https://src.example/1", title: "Source one" }], searchQueries: [], warnings: [], provider: "openai", model: "m", calls: 4,
};
const view = (versions: BrandIntelVersion[], extra: Partial<React.ComponentProps<typeof BrandIntelView>> = {}) =>
  renderToStaticMarkup(<BrandIntelView name="Nash" versions={versions} currentId={versions.find((v) => v.status === "completed")?.id ?? null} busy={false} onSubmit={() => {}} onSelect={() => {}} {...extra} />);

const none = view([]);
assert.match(none, /Submit and run Brand Intelligence/);
assert.match(none, /5 paid AI calls/);
assert.match(none, /Uploaded files are not read yet/);
assert.doesNotMatch(none, /Version 1/);

const done = view([base]);
assert.match(done, /Run again as a new version/);
assert.match(done, /Version 1 \(current\)/);
assert.match(done, /Immutable Guardrails and Downstream Seed Cues/);
// Verify-first callout, then researched red lines as cards in a fixed order, then the numbered sections.
assert.match(done, /Verify before any creative work/);
assert.match(done, /Researched red lines<\/h4>/);
assert.match(done, /not the client&#x27;s stated red lines|not the client&#39;s stated red lines|not the client.{0,8}s stated red lines/);
assert.ok(done.indexOf("Cultural and Aesthetic Taboos") < done.indexOf("Reputational and Regulatory Risks") && done.indexOf("Reputational and Regulatory Risks") < done.indexOf("The Anti-Persona"), "cards in blueprint order");
assert.equal((done.match(/<article class="w-card">/g) || []).length, 3);
assert.match(done, /<span class="w-src w-basis-inf">Inference<\/span>/);
assert.match(done, /<span class="w-src w-basis-stated">Stated by the brand<\/span>/);
assert.match(done, /<strong>neon<\/strong>/);
assert.match(done, /<span class="w-src">Reddit<\/span>/);
assert.ok(done.indexOf("Verify before") < done.indexOf("Researched red lines<") && done.indexOf("Researched red lines<") < done.indexOf("w-section"));
assert.match(done, /Hard client red lines \(verbatim from intake\)/);
assert.match(done, /competitor: Greggs \(Legal dispute\)/);
assert.match(done, /Gap <span class="w-src">Website<\/span>/);
assert.match(done, /no typed brand purpose, known-for text/);
assert.match(done, /Files not read: purpose\.pdf/);
assert.match(done, /<a href="https:\/\/src\.example\/1"[^>]*rel="noopener noreferrer">Source one<\/a>/);
assert.doesNotMatch(done, /Offering and Operational Truth/, "sections that were not returned are not shown (except 6)");

const running = view([base, { ...base, id: "bi_2", version: 2, status: "running", calls: 1, sections: {}, finishedAt: undefined }], { selectedId: "bi_2" });
assert.match(running, /<button[^>]*disabled=""[^>]*>.*Researching/);
assert.match(running, /Working\. This page updates by itself/);
assert.match(running, /Version 2 \(running\)/);

const failed = view([base, { ...base, id: "bi_3", version: 2, status: "failed", error: "AI provider returned 503", sections: {} }], { selectedId: "bi_3" });
assert.match(failed, /AI provider returned 503/);
assert.match(failed, /Version 2 \(failed\)/);
assert.match(failed, /Version 1 \(current\)/, "an earlier completed version stays current");
assert.match(view([base], { busy: true }), /<button[^>]*disabled=""[^>]*>.*Run again/);
// Section 7 splitting is tolerant: unknown sub-headings are kept, missing ones are simply absent.
const rc = redLineCards("Intro\n##### Odd Heading\nx\n##### The Anti-Persona\ny");
assert.equal(rc.intro, "Intro");
assert.deepEqual(rc.cards.map((c) => c.title).sort(), ["Odd Heading", "The Anti-Persona"]);
assert.equal(redLineCards("no headings").cards.length, 0);
console.log("brand-intel-ui: all assertions passed");
