import type { Database, Project } from './model';
import { linkProjectOwnership } from './accounts';
export type AccountMetadata={schemaVersion:2;accountId:string;projectIds:string[];invitations:Database['invitations']};
export function serializeAccount(accountId:string,db:Database){
 const seen=new Set<string>();
 const projects=db.projects.map(p=>{
  if(p.workspaceId!==accountId || (p.accountId && p.accountId!==accountId)) throw Error('Account storage scope mismatch');
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)) throw Error('Invalid project ID');
  if(seen.has(p.id)) throw Error('Duplicate project ID');seen.add(p.id);
  return linkProjectOwnership(p);
 });
 if(db.invitations.some(i=>i.workspaceId!==accountId || !seen.has(i.projectId))) throw Error('Invitation account scope mismatch');
 return {metadata:{schemaVersion:2 as const,accountId,projectIds:[...seen],invitations:db.invitations},projects};
}
export function hydrateAccount(accountId:string,metadata:AccountMetadata,projects:Project[]):Database {
 if(metadata.schemaVersion!==2 || metadata.accountId!==accountId) throw Error('Account metadata scope mismatch');
 if(metadata.projectIds.length!==projects.length || metadata.projectIds.some(id=>!projects.some(p=>p.id===id))) throw Error('Missing account project');
 const checked=serializeAccount(accountId,{schemaVersion:1,projects,invitations:metadata.invitations});
 return {schemaVersion:1,projects:checked.projects,invitations:metadata.invitations};
}
