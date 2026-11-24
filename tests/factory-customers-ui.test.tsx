import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountLogin } from "../src/components/factory/AccountLogin";
import { CustomerEditor } from "../src/components/factory/CustomerEditor";
import Workspace, { Shell, isStaff } from "../src/components/factory/Workspace";
import type { CustomerAccount, Principal } from "../src/lib/factory/model";

// Video workspace pages (CHG-0103, FAC-VWS-001 to 007): server renders of the shell and the customer account editor.
const noop = async () => true;
const customer: CustomerAccount = {
  id: "cust_" + "a".repeat(32), name: "Nash's Bakery", website: "https://nashs.example.com/",
  socials: { instagram: "https://instagram.com/nashs" },
  redLines: [{ id: "r1", category: "competitor", text: "Greggs", reason: "Legal dispute", addedBy: "p", addedAt: "2026-11-25T10:00:00Z" }],
  purposeText: "Make baking joyful", knownFor: "Sourdough and pies",
  brandPurpose: [
    { id: "00000000-0000-0000-0000-000000000001", name: "purpose.pdf", mime: "application/pdf", bytes: 2_500_000, storageKey: "k", uploadedAt: "2026-11-25T10:00:00Z", uploadedBy: "p", rights: { confirmedBy: "p", at: "t" }, modelAuthorisation: { authorisedBy: "p", at: "t" } },
    { id: "00000000-0000-0000-0000-000000000002", name: "mark.png", mime: "image/png", bytes: 900, storageKey: "k", uploadedAt: "2026-11-25T10:00:00Z", uploadedBy: "p", rights: { confirmedBy: "p", at: "t" } },
  ],
  createdAt: "2026-11-25T09:00:00Z", createdBy: "p", updatedAt: "2026-11-25T10:00:00Z", updatedBy: "p",
  audit: [{ id: "a1", at: "2026-11-25T09:00:00Z", actor: "p", action: "customer_created", detail: "Nash's Bakery" }, { id: "a2", at: "2026-11-25T10:00:00Z", actor: "p", action: "purpose_model_authorised", detail: "purpose.pdf" }],
};
const editor = (c: CustomerAccount, extra: Partial<React.ComponentProps<typeof CustomerEditor>> = {}) => renderToStaticMarkup(<CustomerEditor customer={c} busy={false} onSave={noop} onFind={() => {}} onUpload={noop} {...extra} />);

// ---- Editor: the five inputs the owner specified
const html = editor(customer);
for (const text of ["Business name", "Website", "Social links", "Find from website", "Brand purpose", "Client red lines", "Business"]) assert.match(html, new RegExp(text), text);
for (const label of ["X", "Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Pinterest"]) assert.match(html, new RegExp(`<span>${label}</span>`), label + " field");
assert.match(html, /value="https:\/\/instagram\.com\/nashs"/, "saved link shown");
assert.match(html, /value="Nash&#x27;s Bakery"/, "business name shown");
// Typed brand purpose and known-for boxes, with their own model permission, off by default.
assert.match(html, /Brand purpose \(type or paste\)/);
assert.match(html, /What is the brand known for\?/);
assert.match(html, /<textarea[^>]*name="purposeText"[^>]*>Make baking joyful<\/textarea>/);
assert.match(html, /<textarea[^>]*name="knownFor"[^>]*>Sourdough and pies<\/textarea>/);
assert.match(html, /AI steps may read these two texts/);
assert.match(html, /<button class="f-button"[^>]*>Save brand text<\/button>/);
assert.match(editor({ ...customer, textAuthorisation: { authorisedBy: "p", at: "t" } }), /checked=""\/> AI steps may read these two texts/);
// Brand purpose: private, downloadable only through the authorised route, authorisation shown per file, upload locked until rights are confirmed.
assert.match(html, /Files are kept private/);
assert.match(html, new RegExp(`href="/api/factory/customers/${customer.id}/purpose/00000000-0000-0000-0000-000000000001"`));
assert.match(html, /PDF, 2\.4 MB/);
assert.equal((html.match(/AI steps may read this file/g) || []).length, 2);
assert.equal((html.match(/type="checkbox"[^>]*checked=""/g) || []).length, 1, "only the authorised file is ticked");
assert.match(html, /<input[^>]*type="file"[^>]*disabled=""/, "upload disabled until the rights box is ticked");
assert.match(html, /accept="\.pdf,\.docx,\.txt,\.png,\.jpg,\.jpeg"/);
assert.match(html, /I confirm Port67 has the right to hold and use this file/);
// Red lines: each entry separately with category and reason, plus an add form.
assert.match(html, /<span class="f-tag">Competitor<\/span> <strong>Greggs<\/strong>/);
assert.match(html, /Reason: Legal dispute/);
assert.match(html, /Add red line/);
for (const category of ["Topic", "Competitor", "Person or brand", "Word or phrase", "Visual"]) assert.match(html, new RegExp(`<option value="[a-z_]+"[^>]*>${category}</option>`), category);
// History is readable and newest first.
assert.match(html, /History \(2\)/);
assert.ok(html.indexOf("Models allowed to read a file") < html.indexOf("Account created"), "newest first");

// Find from website needs a saved website; empty states guide the producer.
assert.match(editor({ ...customer, website: "" }), /<button[^>]*disabled=""[^>]*><svg[^>]*>.*?<\/svg> Find from website/);
assert.match(editor({ ...customer, website: "" }), /Save the website above/);
assert.doesNotMatch(editor(customer), /<button[^>]*disabled=""[^>]*><svg[^>]*>.*?<\/svg> Find from website/, "enabled with a website");
const empty = editor({ ...customer, socials: {}, redLines: [], brandPurpose: [], audit: [] });
assert.match(empty, /No brand purpose uploaded/);
assert.match(empty, /No red lines yet/);
// Found links are shown for review, never applied silently; a different link than the saved one is called out.
const found = editor(customer, { found: { pageUrl: "https://nashs.example.com/", found: { instagram: "https://instagram.com/other", tiktok: "https://tiktok.com/@nashs" }, existing: customer.socials } });
assert.match(found, /Read https:\/\/nashs\.example\.com\//);
assert.match(found, /Instagram is already https:\/\/instagram\.com\/nashs, the website says https:\/\/instagram\.com\/other/);
assert.match(found, /Use the website link/);
assert.match(found, /placeholder="https:\/\/tiktok\.com\/\.\.\."[^>]*value="https:\/\/tiktok\.com\/@nashs"/, "a found link fills an empty field");
assert.match(found, /placeholder="https:\/\/instagram\.com\/\.\.\."[^>]*value="https:\/\/instagram\.com\/nashs"/, "a saved link is not overwritten by a found one");
assert.match(editor(customer, { found: { pageUrl: "https://nashs.example.com/", found: {}, existing: {} } }), /No social links were found on https:\/\/nashs\.example\.com\//);
// Five files is the limit.
const five = editor({ ...customer, brandPurpose: Array.from({ length: 5 }, (_, i) => ({ ...customer.brandPurpose[1], id: `00000000-0000-0000-0000-00000000000${i}` })) });
assert.match(five, /Five files is the limit/);
// Save buttons use the platform's orange style; removals use the secondary style (AGENTS.md design rule).
assert.match(html, /<button class="f-button"[^>]*>Save business details<\/button>/);
assert.match(html, /<button class="f-button"[^>]*>Save social links<\/button>/);
assert.match(html, /<button class="f-button"[^>]*>Add red line<\/button>/);

// ---- Shell: exactly three entries, nothing from the old portal, admin group for admins only
const producer: Principal = { subject: "p", workspaceId: "w", role: "operator", email: "producer@port67.ai" };
const admin: Principal = { subject: "a", workspaceId: "w", role: "operator", admin: true, identity: "firebase", email: "owner@port67.ai" };
const shell = (p: Principal) => renderToStaticMarkup(<Shell principal={p} tab="customers" setTab={() => {}} onSignOut={() => {}}><p>body</p></Shell>);
const asProducer = shell(producer);
assert.deepEqual([...asProducer.matchAll(/<nav aria-label="Workspace navigation">(.*?)<\/nav>/g)][0][1].match(/<button/g)?.length, 3);
for (const label of ["Overview", "Customer account", "Projects"]) assert.match(asProducer, new RegExp(`</svg>${label}</button>`), label);
for (const old of ["Research room", "Business brief", "Campaign direction", "Ideas bank", "Video advert", "Asset library", "Performance learning", "Capabilities", "Workspace setup", "Team access", "Skill writer", "Private API costs"])
  assert.doesNotMatch(asProducer, new RegExp(old), old + " is parked, not in the new shell");
assert.match(asProducer, /class="active"[^>]*><svg[^>]*>.*?<\/svg>Customer account/, "current page highlighted");
assert.match(asProducer, /Producer<\/span>/);
assert.doesNotMatch(asProducer, /Admin pages/, "producers do not see the admin group");
assert.match(shell(admin), /Admin pages: AI agents, costs, team/);
assert.match(shell(admin), /Admin<\/span>/);
assert.match(asProducer, /<p>body<\/p>/);

// ---- Access: producers and admins only. Customers and the demo are turned away.
assert.equal(isStaff(producer), true);
assert.equal(isStaff(admin), true);
assert.equal(isStaff({ subject: "c", workspaceId: "w", role: "customer" }), false, "customers cannot use it");
assert.equal(isStaff({ subject: "d", workspaceId: "w", role: "operator", demo: true }), false, "the demo cannot use it");
assert.equal(isStaff(null), false);

// ---- Sign-in never offers account creation in this workspace; the legacy sign-in still does by default.
assert.doesNotMatch(renderToStaticMarkup(<AccountLogin allowSignup={false} onAuthenticated={async () => {}} />), /Create an account/);
assert.match(renderToStaticMarkup(<AccountLogin allowSignup={false} onAuthenticated={async () => {}} />), /For Port67 producers and admins/);
assert.match(renderToStaticMarkup(<AccountLogin onAuthenticated={async () => {}} />), /Create an account/, "the existing portal is unchanged");
assert.match(renderToStaticMarkup(<Workspace />), /Opening your workspace/);
console.log("customers-ui: all assertions passed");
