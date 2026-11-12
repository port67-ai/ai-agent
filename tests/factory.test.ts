import assert from "node:assert/strict";
import {
  createProject,
  transition,
  projectView,
  strategyHash,
  makeAsset,
} from "../src/lib/factory/engine";
import type { Principal, Project } from "../src/lib/factory/model";
const op: Principal = {
  role: "operator",
  workspaceId: "test",
  subject: "producer",
};
const customer: Principal = {
  role: "customer",
  workspaceId: "test",
  subject: "client",
  projectId: "test-project",
};
let p: Project = createProject(
  {
    business: "Northstar",
    objective: "Explain the new booking service",
    description: "A synthetic service that helps plan bookings.",
    website: "https://example.com",
    contact: "client@example.com",
  },
  op,
  "test-project",
);
const act = (command: Record<string, unknown>, principal = op) => {
  p = transition(p, command, principal);
};
assert.throws(
  () =>
    transition(
      p,
      {
        type: "addSource",
        segment: "customer",
        title: "Review",
        url: "http://127.0.0.1",
        excerpt: "bad",
      },
      op,
    ),
  /public HTTPS/,
);
act({
  type: "addSource",
  segment: "customer",
  title: "Customer interview",
  excerpt: "I want to spend less time arranging appointments.",
  kind: "client_assertion",
});
assert.equal(p.sources.length, 1);
assert.throws(
  () => transition(p, { type: "draftStrategy" }, customer),
  /operator/,
);
act({
  type: "addSource",
  segment: "brand",
  title: "Published brand page",
  url: "https://example.com/about",
  excerpt: "A booking service for everyday businesses.",
});
act({ type: "reviewSource", id: p.sources.at(-1)!.id, status: "supported" });
act({
  type: "addInsight",
  title: "Lead with clarity",
  interpretation: "Explain the service plainly based on its published scope.",
  sourceIds: [p.sources.at(-1)!.id],
});
act({ type: "draftStrategy" });
assert.equal(
  projectView(p, customer).strategies.length,
  0,
  "unshared direction must stay private",
);
assert.throws(() => transition(p, { type: "produce" }, op), /approved/);
act({ type: "shareStrategy" });
assert.equal(projectView(p, customer).strategies.length, 1);
const hash = strategyHash(p.strategies.at(-1)!);
assert.throws(
  () => transition(p, { type: "approveStrategy", hash: "stale" }, customer),
  /changed/,
);
act({ type: "approveStrategy", hash }, customer);
act({ type: "produce", requestId: "production-1" });
const n = p.assets.length;
act({ type: "produce", requestId: "production-1" });
assert.equal(p.assets.length, n, "retry idempotency");
assert.ok(p.tasks.every((t) => t.strategyHash === hash));
assert.equal(
  projectView(p, customer).assets.length,
  0,
  "unshared assets private",
);
act({ type: "shareAsset", id: p.assets[0].id });
act(
  { type: "approveAsset", id: p.assets[0].id, hash: p.assets[0].hash },
  customer,
);
assert.equal(p.assets[0].status, "approved");
assert.match(makeAsset(p, p.assets[0]), /svg/);
const old = p.strategies[0];
act({ type: "draftStrategy" });
assert.equal(old.status, "approved", "history immutable");
assert.throws(() => transition(p, { type: "produce" }, op), /approved/);
assert.throws(
  () => projectView(p, { ...customer, projectId: "other" }),
  /Forbidden/,
);
assert.throws(
  () => projectView(p, { ...op, workspaceId: "elsewhere" }),
  /Forbidden/,
);
act({
  type: "proposeCapability",
  name: "Accessibility specialist",
  reason: "Review motion for vestibular sensitivity",
});
assert.equal(p.capabilities[0].status, "proposed");
assert.throws(
  () =>
    transition(p, { type: "promoteCapability", id: p.capabilities[0].id }, op),
  /Unsupported/,
);
assert.throws(
  () => createProject({ business: "", objective: "x" }, op),
  /business/,
);
assert.throws(
  () =>
    transition(
      p,
      { type: "approveAsset", id: p.assets[1].id, hash: p.assets[1].hash },
      customer,
    ),
  /approved/,
);
assert.throws(
  () =>
    transition(
      p,
      { type: "reviewSource", id: p.sources[0].id, status: "supported" },
      op,
    ),
  /client assertion/,
);
console.log(
  "Factory domain: approval, lineage, privacy, evidence, validation and idempotency passed.",
);
let intake = createProject(
  {
    business: "Brief pending",
    objective: "Awaiting customer input",
    contact: "client@example.com",
  },
  op,
  "intake",
);
const intakeCustomer = { ...customer, projectId: "intake" };
intake = transition(
  intake,
  {
    type: "updateBrief",
    business: "Customer brand",
    objective: "Launch a consumer product",
    contact: "client@example.com",
    description: "A new outdoor product",
  },
  intakeCustomer,
);
assert.equal(intake.brief.business, "Customer brand");
intake = transition(intake, { type: "draftStrategy" }, op);
assert.throws(
  () =>
    transition(
      intake,
      { type: "updateBrief", business: "Changed" },
      intakeCustomer,
    ),
  /direction/,
);
assert.throws(
  () =>
    createProject(
      {
        business: "Bad logo",
        objective: "Test",
        contact: "a@example.com",
        logoData: "data:image/svg+xml;base64,PHNjcmlwdD4=",
      },
      op,
    ),
  /PNG/,
);
console.log(
  "Customer intake: editable brief before direction, lock after direction, unsafe logo rejection passed.",
);
let research = createProject(
  { business: "Insight test", objective: "Explain", contact: "a@example.com" },
  op,
  "insights",
);
research = transition(
  research,
  {
    type: "addSource",
    segment: "customer",
    kind: "public_source",
    url: "https://example.com/review",
    title: "Published review",
    excerpt: "The buying experience was confusing.",
  },
  op,
);
const sourceId = research.sources[0].id;
assert.throws(
  () =>
    transition(
      research,
      {
        type: "addInsight",
        title: "Clarity matters",
        interpretation: "Address confusion",
        sourceIds: [sourceId],
      },
      op,
    ),
  /reviewed/,
);
research = transition(
  research,
  { type: "reviewSource", id: sourceId, status: "supported" },
  op,
);
research = transition(
  research,
  {
    type: "addInsight",
    title: "Clarity matters",
    interpretation: "Lead with a clear explanation",
    sourceIds: [sourceId],
    confidence: "limited",
  },
  op,
);
assert.equal(research.insights.length, 1);
assert.throws(
  () =>
    transition(
      research,
      {
        type: "addInsight",
        title: "Cross project",
        interpretation: "No",
        sourceIds: ["outside"],
      },
      op,
    ),
  /reviewed/,
);
research = transition(research, { type: "draftStrategy" }, op);
assert.equal(research.strategies[0].insightIds[0], research.insights[0].id);
console.log(
  "Research insights: reviewed-source boundary and source-to-insight-to-direction lineage passed.",
);
const dedup = transition(
  createProject(
    { business: "Replay", objective: "Test", contact: "a@example.com" },
    op,
    "test-project",
  ),
  { type: "draftStrategy", requestId: "secret-op-request" },
  op,
);
assert.throws(
  () =>
    transition(
      dedup,
      { type: "draftStrategy", requestId: "secret-op-request" },
      customer,
    ),
  /operator/,
  "idempotency cannot bypass role checks",
);
const unsupported = transition(
  createProject(
    { business: "No evidence", objective: "Explain", contact: "a@example.com" },
    op,
  ),
  { type: "draftStrategy" },
  op,
);
assert.throws(
  () => transition(unsupported, { type: "shareStrategy" }, op),
  /reviewed.*insight/,
  "shared recommendations need real research lineage",
);
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1cAAAAASUVORK5CYII=";
const withLogo = createProject(
  {
    business: "Logo consent",
    objective: "Launch",
    contact: "a@example.com",
    logoData: png,
    logoPermission: "confirmed",
  },
  op,
  "logo-project",
);
assert.throws(
  () => transition(withLogo, { type: "updateBrief", logoData: png + "=" }, op),
  /permission/,
  "replacement logo must not inherit consent for a different upload",
);
