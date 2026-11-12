import type { Account, Principal, Project } from './model';
import type { Repository } from './repository';
export const accountDirectory = 'factory-account-directory';
export function accountScope(a: Principal) {
  if (a.identity === 'firebase' && a.role === 'customer' && (!a.accountId || a.accountId !== a.workspaceId))
    throw new Error('Forbidden: account scope');
  return a.accountId || a.workspaceId;
}
export function canCreateProject(a: Principal) {
  accountScope(a);
  return a.role === 'operator' || (a.identity === 'firebase' && a.role === 'customer');
}
export function linkProjectOwnership(input: Project): Project {
  const p=structuredClone(input);
  const accountId=p.accountId || p.workspaceId;
  p.accountId=accountId;
  for(const key of ['sources','insights','strategies','tasks','assets','capabilities','audit','runs'] as const)
    for(const item of p[key]) { item.accountId=accountId; item.projectId=p.id; }
  return p;
}
export async function registerAccount(repo:Repository, account:Account) {
  if(!/^acct_[a-f0-9]{32}$/.test(account.id)) throw new Error('Invalid account ID');
  return repo.mutate(accountDirectory,db=>{
    db.accounts ||= [];
    const found=db.accounts.find(x=>x.id===account.id);
    if(found && found.ownerUid!==account.ownerUid) throw new Error('Forbidden: account owner');
    if(!found) {
      if(db.accounts.length>=1000) throw new Error('Account directory limit reached');
      db.accounts.push(account);
    }
    return found || account;
  });
}
export async function listAccounts(repo:Repository,a:Principal) {
  if(a.role!=='operator'||a.identity!=='firebase'||a.demo) throw new Error('Forbidden: producer account access');
  return (await repo.read(accountDirectory)).accounts || [];
}
