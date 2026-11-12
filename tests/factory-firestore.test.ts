import assert from 'node:assert/strict';
import { initializeApp as adminApp,deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp,deleteApp } from 'firebase/app';
import {getFirestore as clientFirestore,connectFirestoreEmulator,doc,getDoc,setDoc} from 'firebase/firestore';
import { FirebaseRepository } from '../src/lib/factory/repository';
import {createProject,transition} from '../src/lib/factory/engine';
async function main(){
 if(!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run with Firebase Firestore emulator; never use a live project');
 const projectId='demo-port67-factory';const app=adminApp({projectId},'storage-emulator-test');const db=getFirestore(app);const repo=new FirebaseRepository(db);
 const a={subject:'a',role:'operator' as const,workspaceId:'acct_a',accountId:'acct_a'};
 let p=createProject({business:'Emulator fixture',objective:'Explain',contact:'fake@example.test'},a,'project-one');
 p=transition(p,{type:'addSource',segment:'brand',title:'Fixture',excerpt:'Test data',kind:'client_assertion'},a);
 await repo.mutate('acct_a',state=>state.projects.push(p));
 const reloaded=await new FirebaseRepository(db).read('acct_a');assert.equal(reloaded.projects[0].sources[0].accountId,'acct_a');assert.equal(reloaded.projects[0].sources[0].projectId,p.id);
 assert.equal((await repo.read('acct_b')).projects.length,0);
 const metadata=(await db.doc('factory_accounts_v2/acct_a').get()).data()!;assert.equal(metadata.projectIds[0],p.id);assert.equal(metadata.projects,undefined);
 assert.equal((await db.doc('factory_accounts_v2/acct_a/projects/project-one').get()).data()!.accountId,'acct_a');
 await Promise.all(Array.from({length:4},()=>repo.mutate('acct_a',state=>state.projects[0].revision++)));
 assert.equal((await repo.read('acct_a')).projects[0].revision,reloaded.projects[0].revision+4);
 await assert.rejects(()=>repo.mutate('acct_b',state=>state.projects.push(p)),/scope/);
 for(const authenticated of [false,true]) {
  const client=initializeApp({projectId,apiKey:'emulator-key'},'rules-'+authenticated);const store=clientFirestore(client);const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(store,host,Number(port),authenticated?{mockUserToken:{sub:'customer-a',email:'test@example.test'}}:undefined);
  await assert.rejects(()=>getDoc(doc(store,'factory_accounts_v2/acct_a/projects/project-one')),/permission|denied/i);
  await assert.rejects(()=>setDoc(doc(store,'factory_system_v1/factory-admin-ledger'),{isAdmin:true}),/permission|denied/i);
  await deleteApp(client);
 }
 await deleteAdminApp(app);console.log('Firestore persistence, transactions and anonymous/authenticated client-deny checks passed');
}void main().catch(e=>{console.error(e);process.exitCode=1;});
