import assert from "node:assert/strict";
import { buildAdvert, compileShot, advertIssues, validateContinuity, promptPack, MAX_SHOT_SEC } from "../src/lib/factory/advert";
import type { Project, Strategy } from "../src/lib/factory/model";

const s = { id: "d1", version: 1, status: "approved", audience: "Owners", message: "Clear use", rationale: "Because", design: "Calm", channels: "", format: "", cta: "Book now", evidenceIds: ["a"], insightIds: [], hypothesis: "", uncertainties: "", tone: "Calm", hash: "h1", createdAt: "", keyMessages: [{ message: "Save 20% on setup", proof: "Vendor page says 20%", sourceIds: ["a"] }, { message: "Easy to start", proof: "p", sourceIds: ["a"] }] } as unknown as Strategy;
const p = { brief: { business: "Foymore", brandColor: "#17477E" }, strategies: [s] } as unknown as Project;
const plan = () => ({ id: "x", createdAt: "", ...buildAdvert(p, s, 1) });

const a = plan();
assert.equal(a.shots.length, 3, "one shot per key message plus a closing shot");
assert.ok(a.shots.every((x) => x.seconds <= MAX_SHOT_SEC && x.seconds >= 3));
assert.equal(a.shots.at(-1)!.onScreen, "Book now");
assert.equal(a.continuity.palette[0], "#17477e");
assert.equal(a.continuity.approved, false);
assert.deepEqual(advertIssues(p, a), []);
assert.deepEqual(plan().hash, a.hash, "deterministic");

assert.throws(() => compileShot(a, a.shots[0]), /Continuity Profile/);
a.continuity.approved = true;
a.shots[0].refs = [{ kind: "prop", label: "Mug" }, { kind: "character", label: "Owner" }, { kind: "location", label: "Shop" }];
const c = compileShot(a, a.shots[0]);
assert.match(c.prompt, /Approved creative treatment: Calm/);
assert.deepEqual(c.refs.map((r) => r.tag + r.kind), ["@Ref1character", "@Ref2location", "@Ref3prop"], "characters, then locations, then props");
assert.match(c.prompt, /^@Ref1 = character: Owner\n@Ref2 = location: Shop\n@Ref3 = prop: Mug\nScene:/);
assert.match(c.prompt, /Format: 16:9, \d+s, 480p draft tier/);
assert.equal(compileShot(a, a.shots[0], "final").prompt, compileShot(a, a.shots[0], "final").prompt);
assert.match(compileShot(a, a.shots[0], "final").prompt, /1080p final tier/);
a.shots[1].overrides = { lens: "85mm" };
assert.match(compileShot(a, a.shots[1]).prompt, /Camera: Full-frame cinema camera, 85mm/);

const bad = plan();
bad.shots[0].seconds = 12;
bad.shots[1].dialogue = "Save 45% today";
const issues = advertIssues(p, bad);
assert.ok(issues.some((x) => /1 to 10 seconds/.test(x)));
assert.ok(issues.some((x) => /45%/.test(x)), "invented figure rejected");
assert.ok(!advertIssues(p, a).some((x) => /20%/.test(x)), "figure from the approved key message is allowed");
bad.continuity.approved = true;
assert.throws(() => compileShot(bad, bad.shots[0]), /1 to 10 seconds/);

assert.throws(() => validateContinuity({ palette: ["red"], lighting: "x", cameraBody: "x", lens: "x", grade: "x", aspect: "16:9" }), /hex/);
assert.throws(() => promptPack(p, a), /customer must approve/);
a.status = "approved";
assert.match(promptPack(p, a), /Shot 3/);
assert.throws(() => buildAdvert(p, { ...s, status: "shared" } as Strategy, 1), /Approve the campaign direction/);
console.log("Video advert planning, continuity and prompt compiler tests passed");
