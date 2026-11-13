import assert from 'node:assert/strict';

async function main() {
  process.env.PORT67_RESEARCH_ENABLED = 'true';
  process.env.PORT67_OPENAI_API_KEY = 'test-only-no-network';
  process.env.PORT67_RESEARCH_MODEL = 'contract-test-model';
  const { parseResearchText, researchSegment } = await import('../src/lib/factory/research');

  const text = [
    'FINDING | Customers say booking is slow | https://example.com/reviews | "took three calls to book"',
    '- FINDING | Rival promises same-day slots | https://www.rival.test/home/ | Same-day appointments',
    'FINDING | Uncited rumour | not-a-url | x',
    'FINDING | Made up source | https://invented.test/page | quote',
    'GAP | No pricing found for the rival',
    'CONFIDENCE | moderate',
    'Some chatter that is ignored',
  ].join('\n');
  const parsed = parseResearchText(text);
  assert.equal(parsed.findings.length, 3, 'unparseable lines dropped');
  assert.deepEqual(parsed.gaps, ['No pricing found for the rival']);
  assert.equal(parsed.confidence, 'moderate');
  assert.equal(parseResearchText('FINDING |||').findings.length, 0);
  assert.equal(parseResearchText('CONFIDENCE | certain').confidence, undefined);

  const original = globalThis.fetch;
  let instructions = '';
  globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
    instructions = JSON.parse(init!.body!).instructions;
    return Response.json({ id: 'r1', usage: { input_tokens: 1, output_tokens: 1 }, output: [{ content: [{ type: 'output_text', text, annotations: [
      { type: 'url_citation', url: 'https://example.com/reviews', title: 'Reviews' },
      { type: 'url_citation', url: 'https://rival.test/home', title: 'Rival' },
      { type: 'url_citation', url: 'https://example.com/other', title: 'Other' },
    ] }] }] });
  }) as typeof fetch;
  const project = { brief: { business: 'B', website: 'https://b.test', description: 'd', objective: 'o', competitors: 'c', inspiration: 'i' } } as never;
  const r = await researchSegment(project, 'customer');
  globalThis.fetch = original;
  assert.ok(/FINDING \|/.test(instructions) && /GAP \|/.test(instructions) && /CONFIDENCE \|/.test(instructions), 'format requested');
  assert.ok(/reviews/i.test(instructions), 'customer focus reaches the prompt');
  assert.equal(r.sources.length, 3);
  const reviews = r.sources.find(s => s.url.includes('example.com/reviews'))!;
  assert.deepEqual(reviews.findings, [{ claim: 'Customers say booking is slow', quote: '"took three calls to book"' }]);
  assert.ok(reviews.excerpt.startsWith('Claim: Customers say booking is slow'), 'excerpt is the source\'s own claim, not the whole answer');
  assert.equal(reviews.confidence, 'moderate');
  assert.ok(r.sources.find(s => s.url.includes('rival.test'))!.findings, 'matches despite www and trailing slash');
  const other = r.sources.find(s => s.url.includes('/other'))!;
  assert.equal(other.findings, undefined);
  assert.ok(other.excerpt.includes('FINDING'), 'cited page with no finding keeps the original text for review');
  assert.ok(!r.sources.some(s => s.url.includes('invented.test')), 'a finding is never a source unless the page was cited');
  assert.deepEqual(r.gaps, ['No pricing found for the rival']);

  // No citations: the error says why (status, truncation, counts), never content.
  let body: { max_output_tokens?: number } = {};
  globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
    body = JSON.parse(init!.body!);
    return Response.json({ id: 'r2', status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, usage: { input_tokens: 5, output_tokens: 1800 }, output: [{ type: 'reasoning' }, { type: 'web_search_call' }] });
  }) as typeof fetch;
  const none = await researchSegment(project, 'brand');
  globalThis.fetch = original;
  assert.equal(none.sources.length, 0);
  assert.match(none.error!, /No usable cited sources returned \(status incomplete, max_output_tokens; 2 output items; 0 characters of text; 0 citations; 0 consulted pages; 0 findings parsed\)/);
  assert.equal(body.max_output_tokens, 5000, 'research gets room for reasoning plus the answer');
  // Only GAP lines is an honest answer: kept as gaps, not a failure, and never as evidence.
  globalThis.fetch = (async () => Response.json({ id: 'r4', status: 'completed', usage: { input_tokens: 5, output_tokens: 90 }, output: [{ type: 'web_search_call' }, { content: [{ type: 'output_text', text: 'GAP | Could not verify public profiles\nGAP | No engagement data found', annotations: [] }] }] })) as typeof fetch;
  const gapsOnly = await researchSegment(project, 'creative');
  globalThis.fetch = original;
  assert.equal(gapsOnly.sources.length, 0);
  assert.equal(gapsOnly.error, undefined, 'a gaps-only answer is not a failure');
  assert.deepEqual(gapsOnly.gaps, ['Could not verify public profiles', 'No engagement data found']);
  // Findings without inline citation markers count only when the search tool itself reported the page.
  let sent: { include?: string[] } = {};
  const uncited = ['FINDING | Opens at 7am | https://shop.test/hours | "open from 7am"', 'FINDING | Invented claim | https://never-searched.test/page | "x"', 'GAP | No price list', 'CONFIDENCE | limited'].join('\n');
  globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
    sent = JSON.parse(init!.body!);
    return Response.json({ id: 'r3', status: 'completed', usage: { input_tokens: 5, output_tokens: 90 }, output: [{ type: 'reasoning' }, { type: 'web_search_call', action: { type: 'search', sources: [{ url: 'https://shop.test/hours', title: 'Shop hours' }, { url: 'https://other.test/', title: 'Unused page' }] } }, { type: 'message', content: [{ type: 'output_text', text: uncited, annotations: [] }] }] });
  }) as typeof fetch;
  const viaTool = await researchSegment(project, 'brand');
  globalThis.fetch = original;
  assert.deepEqual(sent.include, ['web_search_call.action.sources'], 'the search tool is asked to report the pages it used');
  assert.equal(viaTool.error, undefined);
  assert.equal(viaTool.sources.length, 1, 'only a consulted page with a finding becomes a source');
  assert.equal(viaTool.sources[0].url, 'https://shop.test/hours');
  assert.equal(viaTool.sources[0].title, 'Shop hours');
  assert.deepEqual(viaTool.sources[0].findings, [{ claim: 'Opens at 7am', quote: '"open from 7am"' }]);
  assert.match(viaTool.sources[0].method, /no inline citation marker/);
  assert.ok(!viaTool.sources.some((x) => x.url.includes('never-searched')), 'a URL the tool never returned is not evidence');

  console.log('Research findings: claim-level excerpts, gaps, confidence and citation matching passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
