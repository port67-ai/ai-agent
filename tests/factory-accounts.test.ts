import assert from 'node:assert/strict';
import { accountScope, linkProjectOwnership, canCreateProject } from '../src/lib/factory/accounts';
import { access, createProject, transition } from '../src/lib/factory/engine';
import type { Principal } from '../src/lib/factory/model';
const customer:Principal={subject:'uid-a',role:'customer',workspaceId:'acct_a',accountId:'acct_a',identity:'firebase'};
assert.equal(canCreateProject(customer),true);
const p=createProject({business:'Public test',objective:'Explain the service',contact:'owner@example.test',accountId:'acct_evil'},customer);
assert.equal(p.accountId,'acct_a');
assert.equal(p.createdBy,'uid-a');
assert.doesNotThrow(()=>access(p,customer));
assert.throws(()=>access(p,{...customer,workspaceId:'acct_b',accountId:'acct_b'}),/Forbidden/);
assert.throws(()=>accountScope({...customer,workspaceId:'acct_b'}),/Forbidden/);
assert.throws(()=>transition(p,{type:'addSource',title:'x'},customer),/operator/);
const linked=linkProjectOwnership({...p,sources:[{id:'s'} as never],assets:[{id:'a',accountId:'evil'} as never],tasks:[{id:'t'} as never]});
for(const item of [...linked.sources,...linked.assets,...linked.tasks]){
 assert.equal(item.accountId,'acct_a');assert.equal(item.projectId,p.id);
}
assert.throws(()=>createProject({business:'x'}, {...customer,identity:undefined}),/operator/);
console.log('Account ownership/isolation contracts passed');
