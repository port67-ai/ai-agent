import assert from "node:assert/strict";
import type { Commission, Database } from "../src/lib/factory/model";
import { GENERATIONS, INPUTS, INPUT_KEYS, MAX_COMMISSIONS, MAX_EVIDENCE, MAX_LIST, SECONDARY, answerFields, baseline, evidenceSource, inputStatus, listEntryFields } from "../src/lib/factory/commissions";
import { addEvidence, addListEntry, createCommission, commissionsOf, removeEvidence, removeListEntry, renameCommission, saveAnswers, saveAudience, saveWentTooFar, setConfirmed, setDirection, updateEvidence, updateListEntry } from "../src/lib/factory/commissions-commands";

// Commissions and the Inspiration baseline (CHG-0107, FAC-VWS-011 to FAC-VWS-016): rules, commands, status and the baseline view.
const throws = (fn: () => unknown, pattern: RegExp, why: string) => assert.throws(fn, pattern, why);
const empty = (): Database => ({ schemaVersion: 1, projects: [], invitations: [] });
const CUST = "cust_" + "a".repeat(32);
const ev = { source: "https://example.com/about", where: "product_page", note: "Waxed cotton", basis: "announced" };

// ---- The four inputs are numbered as the owner listed them, and the secondary checks are present
assert.deepEqual(INPUTS.map((i) => [i.number, i.key, i.role]), [[1, "objective", "The Filter"], [3, "product", "The Proof"], [4, "audience", "The Bridge"], [5, "brand", "The Anchor"]]);
assert.deepEqual(INPUTS.map((i) => i.prompts.length), [4, 6, 5, 2]);
assert.deepEqual(SECONDARY.map((s) => s.title), ["Company story and values", "Competition and alternatives", "Parallels and creative inspiration"]);

// ---- Validation
assert.deepEqual(answerFields("objective", { why: "  Reframe as a rainy-day staple " }), { input: "objective", answers: { why: "Reframe as a rainy-day staple" } });
throws(() => answerFields("company", {}), /Unknown input/, "no secondary input");
throws(() => answerFields("objective", { nonsense: "x" }), /Unknown question/, "unknown prompt");
throws(() => answerFields("objective", { why: "x".repeat(2001) }), /up to 2000/, "length");
throws(() => answerFields("objective", "x"), /object/, "shape");
assert.equal(evidenceSource("https://example.com/a"), "https://example.com/a");
assert.equal(evidenceSource("www.example.com/a"), "https://www.example.com/a");
assert.equal(evidenceSource("Client call, 12 November"), "Client call, 12 November", "a plain note is allowed");
throws(() => evidenceSource("http://example.com"), /Source link/, "http link refused");
throws(() => evidenceSource("https://127.0.0.1/x"), /Source link/, "private link refused");
throws(() => evidenceSource("  "), /required/, "source required");
throws(() => listEntryFields("preserve", { text: "Waxed cotton" }), /recurs across years/, "scope required");
throws(() => listEntryFields("change", { text: "Setting", scope: "recurring" }), /can change or is out of character/, "kind required on the change list");
assert.deepEqual(listEntryFields("preserve", { text: " Waxed cotton ", scope: "recurring" }), { text: "Waxed cotton", scope: "recurring" });

// ---- Commands
{
  const db = empty();
  throws(() => createCommission(db, CUST, {}, "p"), /Project name is required/, "name required");
  const c = createCommission(db, CUST, { name: "  Autumn London  " }, "producer-1");
  assert.match(c.id, /^comm_[a-f0-9]{32}$/);
  assert.equal(c.name, "Autumn London");
  assert.equal(c.customerId, CUST);
  assert.equal(c.audit[0].action, "project_created");
  assert.deepEqual(inputStatus(c, "objective"), "not_started", "a name alone is enough to start");
  throws(() => createCommission(db, CUST, { name: "autumn london" }, "p"), /already has a project/, "duplicate name, any case");
  const other = createCommission(db, CUST, { name: "Spring" }, "p");
  throws(() => renameCommission(db, other.id, "AUTUMN LONDON", "p"), /already has a project/, "rename onto another");
  assert.equal(renameCommission(db, other.id, "Spring Tokyo", "p").name, "Spring Tokyo");
  const n = other.audit.length;
  renameCommission(db, other.id, "Spring Tokyo", "p");
  assert.equal(other.audit.length, n, "no change, no entry");
  throws(() => renameCommission(db, "../x", "Name", "p"), /not found/, "bad id");

  // Answers: only the prompts sent change; clearing removes; unchanged adds no entry.
  saveAnswers(db, c.id, "objective", { why: "Reframe", success: "Sell-through in London" }, "p");
  saveAnswers(db, c.id, "objective", { response: "Feel it is practical" }, "p");
  assert.deepEqual(c.answers.objective, { why: "Reframe", success: "Sell-through in London", response: "Feel it is practical" });
  const a = c.audit.length;
  saveAnswers(db, c.id, "objective", { why: "Reframe" }, "p");
  assert.equal(c.audit.length, a, "same answer, no entry");
  saveAnswers(db, c.id, "objective", { response: "" }, "p");
  assert.equal(c.answers.objective.response, undefined, "cleared");
  assert.deepEqual(c.answers.product, {}, "other inputs untouched");

  // Brand lists: entries with scope and kind; edits and removal audited; capped.
  const keep = addListEntry(db, c.id, "preserve", { text: "Oiled waxed cotton", scope: "recurring" }, "p");
  const flex = addListEntry(db, c.id, "change", { text: "Rural settings", scope: "single_campaign", kind: "can_change" }, "p");
  addListEntry(db, c.id, "change", { text: "Cosplaying as country gentry", scope: "recurring", kind: "out_of_character" }, "p");
  assert.deepEqual([c.preserve.length, c.change.length], [1, 2]);
  updateListEntry(db, c.id, "change", flex.id, { text: "Countryside settings" }, "p");
  assert.equal(c.change[0].text, "Countryside settings");
  assert.equal(c.change[0].kind, "can_change", "other fields stay");
  throws(() => updateListEntry(db, c.id, "preserve", flex.id, { text: "x" }, "p"), /Entry not found/, "an entry belongs to its own list");
  throws(() => addListEntry(db, c.id, "nope", { text: "x", scope: "recurring" }, "p"), /Unknown list/, "unknown list");
  removeListEntry(db, c.id, "preserve", keep.id, "p");
  assert.equal(c.preserve.length, 0);
  for (let i = 0; i < MAX_LIST; i++) addListEntry(db, c.id, "preserve", { text: "e" + i, scope: "recurring" }, "p");
  throws(() => addListEntry(db, c.id, "preserve", { text: "one more", scope: "recurring" }, "p"), /At most 30/, "list cap");

  // The example that went too far.
  saveWentTooFar(db, c.id, "  The 2019 neon collaboration  ", "p");
  assert.equal(c.wentTooFar, "The 2019 neon collaboration");
  throws(() => saveWentTooFar(db, c.id, "x".repeat(2001), "p"), /up to 2000/, "length");
  throws(() => saveWentTooFar(db, c.id, 5, "p"), /text/, "type");

  // Evidence: per input, basis required, editable, capped per input.
  const e1 = addEvidence(db, c.id, "brand", ev, "p");
  throws(() => addEvidence(db, c.id, "brand", { ...ev, basis: "guess" }, "p"), /announced, client confirmed or your inference/, "basis required");
  throws(() => addEvidence(db, c.id, "brand", { ...ev, where: "somewhere" }, "p"), /where you looked/, "where required");
  throws(() => addEvidence(db, c.id, "company", ev, "p"), /Unknown input/, "no secondary evidence");
  updateEvidence(db, c.id, e1.id, { basis: "inference", note: "My read" }, "p");
  assert.deepEqual([c.evidence[0].basis, c.evidence[0].note, c.evidence[0].source], ["inference", "My read", "https://example.com/about"]);
  throws(() => updateEvidence(db, c.id, "nope", { note: "x" }, "p"), /Evidence not found/, "unknown item");
  for (let i = 1; i < MAX_EVIDENCE; i++) addEvidence(db, c.id, "brand", { ...ev, source: "Note " + i }, "p");
  throws(() => addEvidence(db, c.id, "brand", ev, "p"), /At most 30/, "per-input cap");
  addEvidence(db, c.id, "audience", ev, "p");
  assert.equal(c.evidence.length, MAX_EVIDENCE + 1, "another input has its own allowance");
  removeEvidence(db, c.id, e1.id, "p");
  assert.equal(c.evidence.length, MAX_EVIDENCE);

  // Confirmation with the client applies to the objective and the audience only.
  setConfirmed(db, c.id, "objective", true, "p");
  assert.equal(c.confirmed.objective?.by, "p");
  setConfirmed(db, c.id, "objective", false, "p");
  assert.equal(c.confirmed.objective, undefined);
  throws(() => setConfirmed(db, c.id, "brand", true, "p"), /objective and the audience/, "only two");
  throws(() => setConfirmed(db, c.id, "audience", "yes", "p"), /true or false/, "strict boolean");
  assert.equal(c.audit.length <= 100, true, "audit is bounded");

  // At most 50 projects per account.
  const full = empty();
  for (let i = 0; i < MAX_COMMISSIONS; i++) createCommission(full, CUST, { name: "P" + i }, "p");
  throws(() => createCommission(full, CUST, { name: "One more" }, "p"), /At most 50/, "project cap");
  assert.equal(commissionsOf(full).length, 50);
}

// ---- Status and the baseline
{
  const db = empty();
  const c: Commission = createCommission(db, CUST, { name: "Autumn" }, "p");
  const redLines = [{ id: "r", category: "competitor" as const, text: "Greggs", addedBy: "p", addedAt: "t" }];
  // Empty: the baseline still shows, with every gap listed.
  let b = baseline(c, redLines);
  assert.deepEqual(INPUT_KEYS.map((k) => b.status[k]), ["not_started", "not_started", "not_started", "not_started"]);
  assert.equal(b.gaps.length, 8);
  assert.ok(b.gaps.includes("Input 1, Commission objective is not started"));
  assert.ok(b.gaps.includes("Nothing is listed to preserve"));
  assert.ok(b.gaps.includes("The audience has not been confirmed with the client"));
  assert.deepEqual([b.reach, b.achieve, b.proof, b.evidence], [[], [], [], []]);
  assert.deepEqual(b.redLines, redLines, "account red lines are shown, not copied");
  // Started but incomplete.
  throws(() => saveAnswers(db, c.id, "audience", { who: "x" }, "p"), /age group/, "audience answers are saved per age group");
  saveAudience(db, c.id, "gen_z", { who: "20-somethings in London", putOffs: "Feeling like cosplay" }, "p");
  b = baseline(c);
  assert.equal(b.status.audience, "in_progress");
  assert.ok(b.gaps.includes("Input 4, Current and intended audience has 3 unanswered questions"));
  assert.ok(b.gaps.includes("Input 4, Current and intended audience has no evidence"));
  assert.deepEqual(b.audiences.map((a) => [a.key, a.selected, a.lines.map((x) => x.text)]), [["gen_z", false, ["20-somethings in London", "Feeling like cosplay"]]], "only answered prompts, in order");
  assert.equal(b.directionReady, false);
  assert.ok(b.gaps.includes("No age group is selected for direction"));
  // Evidence alone is also "in progress"; complete needs every prompt and evidence.
  addEvidence(db, c.id, "brand", { ...ev, basis: "inference" }, "p");
  assert.equal(inputStatus(c, "brand"), "in_progress");
  saveAnswers(db, c.id, "brand", { recognisable: "Tactile materiality", recurring: "Wax, corduroy, brass" }, "p");
  assert.equal(inputStatus(c, "brand"), "complete");
  b = baseline(c);
  assert.equal(b.status.brand, "complete");
  assert.ok(!b.gaps.some((g) => g.startsWith("Input 5")), "a complete input has no gap");
  assert.deepEqual(b.evidence.map((g) => [g.input, g.title, g.items[0].basis]), [["brand", "Input 5, Brand expression and boundaries", "inference"]]);
  assert.deepEqual(b.recognise.map((x) => x.text), ["Tactile materiality", "Wax, corduroy, brass"]);
  // Lists, guardrail, proof, achieve and confirmation flow through.
  addListEntry(db, c.id, "preserve", { text: "Waxed cotton", scope: "recurring" }, "p");
  addListEntry(db, c.id, "change", { text: "Rural settings", scope: "single_campaign", kind: "can_change" }, "p");
  saveWentTooFar(db, c.id, "The neon collaboration", "p");
  saveAnswers(db, c.id, "product", { offer: "The Beadnell jacket", proof: "Built to be repaired" }, "p");
  saveAnswers(db, c.id, "objective", { why: "Reframe" }, "p");
  setConfirmed(db, c.id, "objective", true, "p");
  b = baseline(c);
  assert.deepEqual([b.preserve.length, b.fresh.length, b.wentTooFar], [1, 1, "The neon collaboration"]);
  assert.deepEqual(b.proof.map((x) => x.text), ["The Beadnell jacket", "Built to be repaired"]);
  assert.deepEqual(b.achieve.map((x) => x.text), ["Reframe"]);
  assert.ok(!b.gaps.includes("Nothing is listed to preserve"));
  assert.ok(!b.gaps.includes("The objective has not been confirmed with the client"));
  assert.ok(b.gaps.includes("The audience has not been confirmed with the client"));
  // Complete across all four inputs leaves only what is genuinely missing.
  for (const def of INPUTS) { if (def.key === "audience") saveAudience(db, c.id, "gen_y", Object.fromEntries(def.prompts.map((p) => [p.key, "answer"])), "p"); else saveAnswers(db, c.id, def.key, Object.fromEntries(def.prompts.map((p) => [p.key, "answer"])), "p"); if (!c.evidence.some((e) => e.input === def.key)) addEvidence(db, c.id, def.key, ev, "p"); }
  setConfirmed(db, c.id, "audience", true, "p");
  assert.deepEqual(baseline(c).gaps, ["No age group is selected for direction"], "only the selection is missing");
  setDirection(db, c.id, ["gen_y"], "p");
  assert.deepEqual(baseline(c).gaps, [], "nothing missing");
}

// ---- Age groups (CHG-0111)
{
  const db: Database = {} as Database;
  const c = createCommission(db, "cust_" + "a".repeat(32), { name: "Ages" }, "p");
  assert.deepEqual(GENERATIONS.map((g) => [g.key, g.label, g.range]), [["gen_x", "Gen X", "46–61"], ["gen_y", "Gen Y", "30–45"], ["gen_z", "Gen Z / Zoomers", "14–29"], ["gen_alpha", "Gen Alpha", "2–13"]]);
  assert.deepEqual(GENERATIONS.map((g) => g.minors), [false, false, true, true], "groups that include under 18s are flagged");
  throws(() => saveAudience(db, c.id, "boomers", { who: "x" }, "p"), /age group/, "rejected");
  throws(() => saveAudience(db, c.id, "gen_x", { nonsense: "x" }, "p"), /Unknown question/, "rejected");
  throws(() => setDirection(db, c.id, ["gen_x"], "p"), /Save the answers for Gen X first/, "only saved groups can be selected");
  throws(() => setDirection(db, c.id, "gen_x", "p"), /list/, "rejected");
  saveAudience(db, c.id, "gen_alpha", { who: "Parents buy; children use" }, "p", true);
  saveAudience(db, c.id, "gen_x", { who: "Homeowners" }, "p");
  assert.equal(c.audience!.gen_alpha!.ai, true, "an AI draft that was saved is marked");
  assert.equal(c.audience!.gen_x!.ai, undefined);
  setDirection(db, c.id, ["gen_alpha", "gen_x", "gen_x"], "p");
  assert.deepEqual(c.directionGenerations, ["gen_x", "gen_alpha"], "de-duplicated and in age order");
  let b = baseline(c);
  assert.equal(b.directionReady, true);
  assert.deepEqual(b.audiences.map((a) => [a.key, a.selected]), [["gen_x", true], ["gen_alpha", true]]);
  // Saving more answers merges; clearing every answer removes the group and its selection; direction needs one left.
  saveAudience(db, c.id, "gen_x", { motivations: "Quality" }, "p");
  assert.deepEqual(c.audience!.gen_x!.answers, { who: "Homeowners", motivations: "Quality" });
  saveAudience(db, c.id, "gen_x", { who: "", motivations: "" }, "p");
  assert.equal(c.audience!.gen_x, undefined);
  assert.deepEqual(c.directionGenerations, ["gen_alpha"]);
  setDirection(db, c.id, [], "p");
  b = baseline(c);
  assert.equal(b.directionReady, false);
  assert.ok(b.gaps.includes("No age group is selected for direction"));
  assert.match(c.audit.at(-1)!.detail, /none selected/);
  assert.ok(c.audit.some((a) => a.action === "audience_saved" && /Gen Alpha/.test(a.detail)));
}
console.log("commissions: all assertions passed");
