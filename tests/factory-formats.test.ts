import assert from "node:assert/strict";
import { FORMATS, suggestFormats, validFormats, hasVideoFormat, formatNames } from "../src/lib/factory/formats";

assert.ok(FORMATS.some((f) => f.id === "video_ugc") && FORMATS.some((f) => f.id === "written_long"));
const tt = suggestFormats(["tiktok"], "Launch our new snack");
assert.equal(tt[0].id, "video_short");
assert.ok(tt.some((x) => x.id === "video_ugc"));
assert.ok(tt.every((x) => x.reason.length > 0), "every suggestion says why");
const li = suggestFormats(["linkedin"], "Build authority with enterprise buyers");
assert.equal(li[0].id, "written_long", "authority objective lifts long written content on LinkedIn");
assert.ok(suggestFormats([], "").length >= 3, "a default set when nothing is chosen");
assert.deepEqual(suggestFormats(["youtube"], "x"), suggestFormats(["youtube"], "x"), "deterministic");
assert.deepEqual(validFormats(["video_ugc", "static", "static"]), ["static", "video_ugc"]);
assert.throws(() => validFormats([]), /at least one/);
assert.throws(() => validFormats(["hologram"]), /Unknown/);
assert.equal(hasVideoFormat(["static", "written_ad"]), false);
assert.equal(hasVideoFormat(["video_long"]), true);
assert.deepEqual(formatNames(["motion"]), ["Motion graphics ad"]);
console.log("Ad formats: catalogue, rule-based suggestions with reasons, strict selection, video detection");
