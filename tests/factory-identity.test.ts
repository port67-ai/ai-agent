import assert from 'node:assert/strict';
import { revalidateIdentitySession, verifyFactoryIdentity } from '../src/lib/factory/identity';
const project = 'ai-agency-3671b';
process.env.PORT67_FIREBASE_PROJECT_ID = project;
const claims = { uid: 'customer-123', aud: project, iss: `https://securetoken.google.com/${project}`, email: 'person@example.com', email_verified: true, admin: true, role: 'operator' };
async function main() {
  let checked = false;
  const first = await verifyFactoryIdentity('token', async (_, revoked) => { checked = revoked; return claims; });
  assert.equal(checked, true);
  assert.equal(first.role, 'customer');
  assert.equal(first.admin, false);
  assert.match(first.accountId, /^acct_[a-f0-9]{32}$/);
  assert.equal(first.accountId, (await verifyFactoryIdentity('next', async () => claims)).accountId);
  assert.notEqual(first.accountId, (await verifyFactoryIdentity('next', async () => ({ ...claims, uid: 'other' }))).accountId);
  process.env.PORT67_ADMIN_UIDS = claims.uid;
  assert.equal((await verifyFactoryIdentity('token', async () => claims)).admin, true);
  assert.equal((await verifyFactoryIdentity('token', async () => claims)).role, 'operator');
  delete process.env.PORT67_ADMIN_UIDS;
  process.env.PORT67_OPERATOR_UIDS = `someone, ${claims.uid}`;
  assert.equal((await verifyFactoryIdentity('token', async () => claims)).role, 'operator');
  delete process.env.PORT67_OPERATOR_UIDS;
  for (const invalid of [{ ...claims, aud: 'legacy' }, { ...claims, iss: 'wrong' }, { ...claims, email_verified: false }, { ...claims, uid: '' }]) {
    await assert.rejects(verifyFactoryIdentity('token', async () => invalid));
  }
  await assert.rejects(verifyFactoryIdentity('token', async () => { throw new Error('revoked'); }));
  await assert.rejects(verifyFactoryIdentity('', async () => claims));
  process.env.PORT67_FIREBASE_PROJECT_ID = 'legacy-project';
  await assert.rejects(verifyFactoryIdentity('token', async () => claims));
  process.env.PORT67_FIREBASE_PROJECT_ID = project;
  const now = Date.now();
  const user = { uid: claims.uid, emailVerified: true, disabled: false, tokensValidAfterTime: new Date(now - 5000).toISOString() };
  assert.equal((await revalidateIdentitySession(claims.uid, now, async () => user)).accountId, first.accountId);
  for (const invalid of [{ ...user, disabled: true }, { ...user, emailVerified: false }, { ...user, tokensValidAfterTime: new Date(now + 5000).toISOString() }]) {
    await assert.rejects(revalidateIdentitySession(claims.uid, now, async () => invalid));
  }
  console.log('factory identity tests passed');
}
void main();
