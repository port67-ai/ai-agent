import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHANNELS, MAX_CHANNELS, validChannels, channelNames } from '../src/lib/factory/channels';
import { createProject, transition } from '../src/lib/factory/engine';
import ChannelPicker from '../src/components/factory/ChannelPicker';

async function main() {
  // Catalogue: the nine channels from the brief, each with a real brand glyph.
  assert.deepEqual(CHANNELS.map(c => c.name), ['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Pinterest', 'Reddit', 'WhatsApp', 'X & Threads']);
  for (const c of CHANNELS) assert.ok(c.path.length > 100 && /^#[0-9A-F]{6}$/i.test(c.color) && c.summary && c.playbook, c.id);
  assert.deepEqual(validChannels(['youtube', 'linkedin', 'linkedin']), ['linkedin', 'youtube'], 'de-duplicated, catalogue order');
  assert.throws(() => validChannels(['myspace']), /Unknown channel/);
  assert.throws(() => validChannels(CHANNELS.slice(0, MAX_CHANNELS + 1).map(c => c.id)), /up to 5/);
  assert.throws(() => validChannels('linkedin'), /up to 5/);
  assert.deepEqual(channelNames(['tiktok', 'nope']), ['TikTok']);

  // Customers and producers choose channels and request research; locked once direction work begins.
  const op = { role: 'operator' as const, workspaceId: 'w', subject: 'producer' };
  const cust = { role: 'customer' as const, workspaceId: 'w', subject: 'client', projectId: 'p1' };
  let p = createProject({ business: 'Brand', objective: 'Grow', contact: 'a@example.com' }, op, 'p1');
  assert.throws(() => transition(p, { type: 'requestResearch' }, cust), /at least one launch channel/);
  p = transition(p, { type: 'setChannels', channels: ['linkedin', 'youtube'] }, cust);
  assert.deepEqual(p.channels, ['linkedin', 'youtube']);
  p = transition(p, { type: 'requestResearch', channels: ['linkedin', 'youtube', 'reddit'] }, cust);
  assert.deepEqual(p.researchRequest?.channels, ['linkedin', 'youtube', 'reddit']);
  assert.equal(p.researchRequest?.by, 'client');
  assert.throws(() => transition(p, { type: 'setChannels', channels: ['nope'] }, cust), /Unknown channel/);
  assert.throws(() => transition(p, { type: 'authoriseAI', confirm: true }, cust), /operator|Forbidden/i, 'customers still cannot authorise paid AI');
  p = transition(p, { type: 'setChannels', channels: ['instagram'] }, op);
  assert.deepEqual(p.channels, ['instagram']);
  const locked = { ...p, strategies: [{ id: 's' } as never] };
  assert.throws(() => transition(locked, { type: 'setChannels', channels: ['tiktok'] }, op), /locked/);

  // Prompts carry the chosen channels.
  process.env.PORT67_RESEARCH_ENABLED = 'true';
  process.env.PORT67_OPENAI_API_KEY = 'test-only-no-network';
  process.env.PORT67_RESEARCH_MODEL = 'contract-test-model';
  const { researchSegment } = await import('../src/lib/factory/research');
  const original = globalThis.fetch;
  let sent = '';
  globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => { sent = init!.body!; return Response.json({ id: 'x', usage: {}, output: [] }); }) as typeof fetch;
  await researchSegment({ ...p, channels: ['linkedin', 'tiktok'] }, 'creative');
  assert.ok(sent.includes('LinkedIn') && sent.includes('nativePlaybook') && sent.includes('launch channels'), 'creative research is channel-aware');
  await researchSegment({ ...p, channels: [] }, 'creative');
  assert.ok(!sent.includes('launchChannels'), 'no channels, no channel prompt');
  globalThis.fetch = original;

  // The picker: nine toggle buttons with logos, a producer Start button and a customer Request button.
  const base = { p: { ...p, channels: ['linkedin'], strategies: [], aiAuthorised: true } as never, busy: false, live: true, command: () => undefined, onRunAll: () => undefined };
  const op1 = renderToStaticMarkup(<ChannelPicker {...base} operator={true} />);
  assert.equal((op1.match(/aria-pressed/g) || []).length, 9);
  assert.equal((op1.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(op1.includes('Start research') && !op1.includes('Request research'));
  assert.ok(op1.includes('LinkedIn logo') && op1.includes('1 of 5 chosen'));
  const cu1 = renderToStaticMarkup(<ChannelPicker {...base} operator={false} />);
  assert.ok(cu1.includes('Request research') && !cu1.includes('Start research'));
  const lockedMarkup = renderToStaticMarkup(<ChannelPicker {...base} p={{ ...(base.p as object), strategies: [{}] } as never} operator={false} />);
  assert.ok(lockedMarkup.includes('locked') && !lockedMarkup.includes('Request research'));
  console.log('Launch channels: catalogue, role-aware selection, research request, locking, channel-aware prompts and picker passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
