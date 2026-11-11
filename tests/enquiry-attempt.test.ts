import assert from "node:assert/strict";
import { enquiryAttempt } from "../src/lib/enquiry-attempt";
const first = enquiryAttempt('{"challenge":"original"}');
const retry = enquiryAttempt('{"challenge":"original"}', first);
assert.equal(
  retry.key,
  first.key,
  "An unchanged retry must keep the same idempotency key",
);
const edited = enquiryAttempt('{"challenge":"edited"}', first);
assert.notEqual(
  edited.key,
  first.key,
  "An edited enquiry must not reuse the prior acknowledgement",
);
console.log("Enquiry retry identity: unchanged and edited retries passed.");
