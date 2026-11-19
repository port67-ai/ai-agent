import assert from "node:assert/strict";
import { resolveChannelId } from "../src/lib/factory/channels";

// A model may write a channel's display name, any case, or the id. All map back to the allowed id; anything else is refused.
const allowed = ["facebook", "instagram", "x_threads"];
assert.equal(resolveChannelId("x_threads", allowed), "x_threads");
assert.equal(resolveChannelId("X & Threads", allowed), "x_threads");
assert.equal(resolveChannelId("x & threads", allowed), "x_threads");
assert.equal(resolveChannelId("Instagram", allowed), "instagram");
assert.equal(resolveChannelId("FACEBOOK", allowed), "facebook");
assert.equal(resolveChannelId("tiktok", allowed), undefined, "a channel that was not chosen is refused");
assert.equal(resolveChannelId("", allowed), undefined);
assert.equal(resolveChannelId(undefined, allowed), undefined);
console.log("Channel name resolution passed");
