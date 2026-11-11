import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../src/app/(studio)/page";
import Understand from "../src/app/(studio)/understand/page";
import Automate from "../src/app/(studio)/automate/page";
import Explain from "../src/app/(studio)/explain/page";
import Work from "../src/app/(studio)/work/page";
import Process from "../src/app/(studio)/process/page";
import Contact from "../src/app/(studio)/contact/page";
import Privacy from "../src/app/(studio)/privacy/page";
import Terms from "../src/app/(studio)/terms/page";
for (const [name, Page] of Object.entries({
  Home,
  Understand,
  Automate,
  Explain,
  Work,
  Process,
  Contact,
  Privacy,
  Terms,
})) {
  const html = renderToStaticMarkup(<Page />);
  assert.equal(
    (html.match(/<h1[ >]/g) || []).length,
    1,
    `${name} must have exactly one h1`,
  );
  assert.ok(
    !html.includes("Never Miss a Customer"),
    `${name} must use studio positioning`,
  );
}
const home = renderToStaticMarkup(<Home />);
for (const path of [
  "understand",
  "automate",
  "explain",
  "work",
  "process",
  "contact",
])
  assert.ok(home.includes(`href="/${path}"`), `${path} must be reachable`);
assert.ok(home.includes("Synthetic data"));
assert.ok(!home.includes('href="/pricing"'));
const contact = renderToStaticMarkup(<Contact />);
assert.match(contact, /Online enquiries are not yet open/);
assert.match(contact, /<fieldset[^>]*disabled/);
assert.match(contact, /<button[^>]*disabled/);
for (const name of [
  "name",
  "email",
  "organisation",
  "role",
  "service",
  "budget",
  "timing",
  "decision",
  "challenge",
  "systems",
  "ack",
  "website",
])
  assert.ok(contact.includes(`name="${name}"`), name);
console.log(
  "Studio rendering: nine pages, headings, homepage routes and unavailable form passed.",
);
