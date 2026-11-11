import assert from "node:assert/strict";
import { validateEnquiry } from "../src/lib/enquiries";
const valid = {
  name: "Test Person",
  email: "person+test@example.org",
  organisation: "Example Ltd",
  role: "",
  service: "automate",
  budget: "8-12k",
  timing: "soon",
  decision: "shared",
  challenge: "We need a controlled workflow for reviewing incoming enquiries.",
  systems: "CRM",
  ack: true,
  website: "",
};
assert.equal(validateEnquiry(valid).ok, true);
for (const patch of [
  { ack: false },
  { service: "other" },
  { budget: "invalid" },
  { timing: "invalid" },
  { email: "not-email" },
  { challenge: "too short" },
  { name: "A" },
  { organisation: "A" },
  { website: "bot" },
  { decision: "maybe" },
  { systems: "x".repeat(201) },
]) {
  assert.equal(
    validateEnquiry({ ...valid, ...patch }).ok,
    false,
    JSON.stringify(patch),
  );
}
assert.equal(validateEnquiry(null).ok, false);
assert.equal(validateEnquiry({ ...valid, name: "Line\nBreak" }).ok, false);
console.log("Enquiry schema: valid input and 13 rejection cases passed.");
