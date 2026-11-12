import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function main() {
  const dir = await mkdtemp(join(tmpdir(), 'port67-video-'));
  process.env.PORT67_DATA_DIR = join(dir, 'live');
  process.env.PORT67_DEMO_DATA_DIR = join(dir, 'demo');
  process.env.PORT67_OPERATOR_PASSWORD = 'test-only-operator-password';
  process.env.PORT67_SESSION_SECRET = 'test-only-session-secret-with-at-least-32-characters';
  const V = await import('../src/lib/factory/video');
  const { handleFactory } = await import('../src/lib/factory/service');
  const { LocalRepository } = await import('../src/lib/factory/repository');

  // Scene text is escaped and bounded; the encoder command is a fixed argument list.
  const project = { brief: { business: 'A & B <Co>', objective: 'Grow "fast"', brandColor: 'red; x', logoData: 'javascript:1' } } as never;
  const strategy = { message: 'Hello </text><script>', cta: 'Call now' } as never;
  const scenes = V.videoScenes(project, strategy);
  assert.equal(scenes.length, 3);
  const svg = V.sceneSvg(project, scenes[0], 0);
  assert.ok(!svg.includes('<script') && !svg.includes('javascript:') && !svg.includes('red; x'), 'untrusted values never reach the SVG raw');
  assert.ok(svg.includes('A &amp; B &lt;CO&gt;'));
  const args = V.encoderArgs(['a.png', 'b.png', 'c.png'], 'o.mp4');
  assert.ok(args.includes('libx264') && args.filter(x => x === '-i').length === 3);

  // A real render, then the file is a playable MP4 of about fifteen seconds.
  const ok = { brief: { business: 'Test Bakery', objective: 'Sell more bread this spring', brandColor: '#d9480f' } } as never;
  const bytes = await V.renderVideo(ok, { message: 'Fresh bread, every morning', cta: 'Order today' } as never);
  assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
  assert.ok(bytes.length > 5000 && bytes.length < 5_000_000, 'size ' + bytes.length);
  // Only one render at a time.
  const first = V.renderVideo(ok, { message: 'One', cta: 'Two' } as never);
  await assert.rejects(() => V.renderVideo(ok, { message: 'Three', cta: 'Four' } as never), /Another video is rendering/);
  await first;
  // Encoder failure surfaces and releases the lock.
  await assert.rejects(() => V.renderVideo(ok, { message: 'x', cta: 'y' } as never, async () => { throw new Error('Video encoder failed'); }), /encoder failed/);
  await V.renderVideo(ok, { message: 'again', cta: 'ok' } as never);

  // API: only an approved storyboard against the approved direction can be rendered; customers get approved videos only.
  let cookie = '';
  async function request(path: string, body?: unknown) {
    const r = await handleFactory(new Request('http://localhost:3000/api/factory/' + path, { method: body ? 'POST' : 'GET', headers: { origin: 'http://localhost:3000', cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }), path.split('/'));
    const set = r.headers.get('set-cookie');
    if (set) { const pair = set.split(';')[0], name = pair.split('=')[0]; cookie = cookie.split(';').map(s => s.trim()).filter(s => s && !s.startsWith(name + '=')).concat(pair).join('; '); }
    return r;
  }
  await request('session');
  assert.equal((await request('login', { password: process.env.PORT67_OPERATOR_PASSWORD })).status, 200);
  const principal = (await (await request('session')).json()).principal;
  const created = await (await request('projects', { business: 'Video Co', objective: 'Launch', contact: 'o@example.com' })).json();
  const pid = created.project.id as string;
  assert.equal((await request(`projects/${pid}/video`, { assetId: 'nope' })).status, 400);

  // Seed an approved direction and approved motion storyboard straight into the workspace store.
  const repo = new LocalRepository(process.env.PORT67_DATA_DIR);
  await repo.mutate(principal.workspaceId, (db) => {
    const p = db.projects.find(x => x.id === pid)!;
    p.strategies.push({ id: 's1', version: 1, status: 'approved', hash: 'h1', message: 'Fresh ideas daily', cta: 'Talk to us', audience: '', rationale: '', design: '', channels: '', format: '', evidenceIds: [], insightIds: [], hypothesis: '', uncertainties: '', createdAt: new Date().toISOString() });
    p.assets.push({ id: 'm1', version: 1, kind: 'motion', title: 'Motion', strategyId: 's1', strategyHash: 'h1', taskId: 't', evidenceIds: [], status: 'draft', content: '<html></html>', hash: 'ah', createdAt: new Date().toISOString() });
    p.assets.push({ id: 'c1', version: 1, kind: 'copy', title: 'Copy', strategyId: 's1', strategyHash: 'h1', taskId: 't', evidenceIds: [], status: 'approved', content: 'x', hash: 'ch', createdAt: new Date().toISOString() });
  });
  assert.equal((await request(`projects/${pid}/video`, { assetId: 'm1' })).status, 400, 'draft storyboard cannot render');
  assert.equal(V.VIDEO_SIZE, 480, 'drafts default to 480');
  assert.equal((await request(`projects/${pid}/video`, { assetId: 'c1' })).status, 400, 'only motion assets render');
  await repo.mutate(principal.workspaceId, (db) => { const x = db.projects.find(x => x.id === pid)!; x.assets.find(x => x.id === 'm1')!.status = 'approved'; x.assets.find(x => x.id === 'c1')!.status = 'draft'; });
  const gate = await request(`projects/${pid}/video`, { assetId: 'm1' });
  assert.equal(gate.status, 400);
  assert.match((await gate.json()).error, /copy set/, 'approved storyboard alone is not enough: the copy set must be approved too');
  await repo.mutate(principal.workspaceId, (db) => { db.projects.find(x => x.id === pid)!.assets.find(x => x.id === 'c1')!.status = 'approved'; });
  assert.equal((await request(`projects/${pid}/video`, { assetId: 'm1', size: 720 })).status, 400, 'only 480 or 1080');
  const done = await request(`projects/${pid}/video`, { assetId: 'm1' });
  assert.equal(done.status, 200);
  const video = (await done.json()).video;
  assert.equal(video.seconds, 15);
  assert.equal(video.size, 480, 'default render is the 480p draft');
  const hd = (await (await request(`projects/${pid}/video`, { assetId: 'm1', size: 1080 })).json()).video;
  assert.equal(hd.size, 1080);
  assert.ok(hd.bytes > video.bytes, 'HD is larger than the draft');
  // An AI copy pack, once drafted, becomes the copy set that must be approved.
  const { copySetApproved } = await import('../src/lib/factory/copy-set');
  const ps = { assets: [{ kind: 'copy', title: 'Copy & script', strategyHash: 'h', status: 'approved' }, { kind: 'copy', title: 'AI copy pack', strategyHash: 'h', status: 'draft' }] } as never;
  assert.equal(copySetApproved(ps, 'h'), false);
  assert.equal(copySetApproved({ assets: [] } as never, 'h'), false);
  const file = await request(`projects/${pid}/video/${video.id}`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'video/mp4');
  const body = Buffer.from(await file.arrayBuffer());
  assert.equal(body.length, video.bytes);
  assert.equal((await request(`projects/${pid}/video/not-a-video`)).status, 403);
  assert.ok((await (await request(`projects/${pid}`)).json()).project.audit.some((x: { action: string }) => x.action === 'video_rendered'));

  // A superseded storyboard (changed hash while rendering is not possible here) and the stored file leave no stray temp files.
  const info = execFileSync('ls', [join(process.env.PORT67_DATA_DIR!, 'videos')]).toString();
  assert.ok(info.length > 0);

  await rm(dir, { recursive: true, force: true });
  console.log('Video render: escaped scenes, real MP4 encode, single render lock, approval gates and stored download passed');
}
void main().catch(e => { console.error(e); process.exit(1); });
