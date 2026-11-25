import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImageLibraryView, type LibraryImage } from "../src/components/factory/ImageLibrary";
import { PromptsSection } from "../src/components/factory/VideoStepsSections";
import type { VideoPlan } from "../src/lib/factory/model";

// Image library UI (CHG-0116): upload button, carousel, review panel, @name prompts.
const cid = "cust_" + "a".repeat(32), pid = "comm_" + "b".repeat(32);
const img = (id: string, name: string, description = ""): LibraryImage => ({ id, commissionId: pid, name, description, mime: "image/png", bytes: 2048, uploadedAt: "2026-11-25T10:00:00Z", uploadedBy: "a" });
const view = (images: LibraryImage[], selectedId = "", progress = "") => renderToStaticMarkup(<ImageLibraryView cid={cid} images={images} selectedId={selectedId} busy={false} progress={progress} onSelect={() => {}} onFiles={() => {}} onSave={async () => true} onRemove={() => {}} />);

const empty = view([]);
assert.match(empty, /Upload images/);
assert.match(empty, /<input[^>]*type="file"[^>]*multiple=""/);
assert.match(empty, /No images yet/);
assert.match(empty, /as @name/);
assert.doesNotMatch(empty, /Scroll images left/);

const h = view([img("i1", "baker", "Maya, 30s"), img("i2", "loaf")], "i2", "2 uploaded.");
assert.match(h, /aria-label="Scroll images left"/);
assert.match(h, new RegExp(`src="/api/factory/video-images/${cid}/${pid}/file/i1"`));
assert.match(h, />@baker<\/span>/);
assert.match(h, /aria-pressed="true"[^>]*title="loaf"/, "selected thumbnail is marked");
assert.match(h, /2 of 2/);
assert.match(h, /value="@loaf"/);
assert.match(h, /Copy @loaf/);
assert.match(h, /Delete/);
assert.match(h, /Description \(optional\)/);
assert.match(h, /2 uploaded\./);

const plan = { id: "vp", commissionId: pid, generation: "gen_y", references: [], chat: [], sheets: [], script: { template: "15", title: "t", shots: [{ seconds: 5, visual: "v", line: "", onScreen: "" }], savedBy: "a", savedAt: "2026-11-25T08:00:00Z" }, prompts: { overall: "Look of @baker", shots: [{ shot: 1, prompt: "@baker kneads with @ghost", negative: "" }], generatedAt: "2026-11-25T09:00:00Z", by: "a", model: "m" }, createdAt: "", updatedAt: "", updatedBy: "a" } as unknown as VideoPlan;
const p = { busy: false, generating: false, onSave: async () => true, onGenerate: () => {} };
const withImgs = renderToStaticMarkup(<PromptsSection plan={plan} {...p} images={[img("i1", "baker")]} />);
assert.match(withImgs, /Images you can refer to/);
assert.match(withImgs, /Copy @baker/);
assert.match(withImgs, /mention @ghost, which is not in the project image library/);
assert.doesNotMatch(withImgs, /@baker, which/);
assert.match(renderToStaticMarkup(<PromptsSection plan={plan} {...p} images={[]} />), /None yet\. Upload some under Characters, locations and props/);
console.log("video-images-ui: all assertions passed");
