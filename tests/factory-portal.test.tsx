import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PortalWelcome } from "../src/components/factory/Portal";
const html = renderToStaticMarkup(
  <PortalWelcome busy={false} onDemo={() => {}} onLogin={() => {}} error="" />,
);
assert.ok(html.includes("Research-led marketing content"));
assert.ok(html.includes("creative production"));
assert.ok(html.includes("Explore the demo"));
assert.ok(html.includes("Synthetic"));
assert.ok(html.includes("Operator password"));
console.log(
  "Factory portal: service positioning, demo disclosure and login entry passed.",
);
import {
  createProject,
  transition,
  projectView,
} from "../src/lib/factory/engine";
import Assets from "../src/components/factory/Assets";
const op = {
  role: "operator" as const,
  workspaceId: "view-test",
  subject: "producer",
};
let project = createProject(
  { business: "Paused view", objective: "Explain", contact: "a@example.com" },
  op,
  "view-project",
);
const client = {
  ...op,
  role: "customer" as const,
  projectId: project.id,
  subject: "customer",
};
project = transition(
  project,
  {
    type: "addSource",
    segment: "brand",
    title: "Brand facts",
    url: "https://example.com/about",
    excerpt: "Source fixture",
  },
  op,
);
project = transition(
  project,
  { type: "reviewSource", id: project.sources[0].id, status: "supported" },
  op,
);
project = transition(
  project,
  {
    type: "addInsight",
    title: "Explain clearly",
    interpretation: "Clarity supports understanding",
    sourceIds: [project.sources[0].id],
  },
  op,
);
project = transition(project, { type: "draftStrategy" }, op);
project = transition(project, { type: "shareStrategy" }, op);
project = transition(
  project,
  { type: "approveStrategy", hash: project.strategies[0].hash },
  client,
);
project = transition(project, { type: "produce" }, op);
project = transition(
  project,
  { type: "shareAsset", id: project.assets[0].id },
  op,
);
project = transition(
  project,
  {
    type: "approveAsset",
    id: project.assets[0].id,
    hash: project.assets[0].hash,
  },
  client,
);
project = transition(project, { type: "draftStrategy" }, op);
const customerView = projectView(project, client);
assert.equal(customerView.deliveryPaused, true);
const pausedHtml = renderToStaticMarkup(
  <Assets
    p={customerView}
    operator={false}
    busy={false}
    command={() => undefined}
  />,
);
assert.ok(pausedHtml.includes("Revision in progress"));
assert.ok(!pausedHtml.includes("Delivery manifest"));
console.log(
  "Customer revision view: safe pause without internal draft disclosure passed.",
);
