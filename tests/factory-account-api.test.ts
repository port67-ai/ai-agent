import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
async function main(){
 const dir=await mkdtemp(join(tmpdir(),'port67-account-api-'));process.env.PORT67_DATA_DIR=dir;process.env.PORT67_SESSION_SECRET='s'.repeat(48);process.env.PORT67_OPERATOR_PASSWORD='p'.repeat(24);process.env.PORT67_FIREBASE_PROJECT_ID='ai-agency-3671b';process.env.PORT67_ADMIN_UIDS='owner';process.env.PORT67_OPERATOR_UIDS='producer';
 const {handleFactory}=await import('../src/lib/factory/service');
 const verifier=async(token:string)=>({uid:token,aud:'ai-agency-3671b',iss:'https://securetoken.google.com/ai-agency-3671b',email_verified:true,auth_time:Math.floor(Date.now()/1000),email:token+'@example.test'});
 let disabled=false;
 const lookup=async(uid:string)=>({uid,emailVerified:true,disabled,tokensValidAfterTime:new Date(0).toISOString()});
 let cookie='';
 async function req(path:string,body?:unknown){const r=await handleFactory(new Request('http://localhost:3000/api/factory/'+path,{method:body?'POST':'GET',headers:{origin:'http://localhost:3000',cookie,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),path.split('/'),verifier,lookup);const set=r.headers.get('set-cookie');if(set){const pair=set.split(';')[0],name=pair.split('=')[0];cookie=cookie.split(';').filter(x=>x.trim()&&!x.trim().startsWith(name+'=')).concat(pair).join(';');}return r;}
 async function login(uid:string){cookie='';await req('session');const r=await req('identity-login',{idToken:uid,accountId:'foreign',admin:true});assert.equal(r.status,200);return(await r.json()).principal;}
 const a=await login('customer-a');assert.equal(a.admin,false);assert.equal((await req('admin/costs')).status,403);
 const r=await req('projects',{business:'Alpha',objective:'Awareness',contact:'a@example.test',accountId:'foreign'});assert.equal(r.status,201);const p=(await r.json()).project;assert.equal(p.accountId,a.accountId);assert.equal(p.createdBy,'customer-a');
 assert.equal((await req('projects/'+p.id,{type:'authoriseAI',confirm:true})).status,403);
 assert.equal((await req('accounts')).status,403);
 const b=await login('customer-b');assert.notEqual(a.accountId,b.accountId);assert.equal((await req('projects/'+p.id)).status,403);assert.equal((await(await req('projects')).json()).projects.length,0);
 await login('producer');assert.equal((await req('admin/costs')).status,403);assert.equal((await req('accounts',{accountId:a.accountId})).status,200);assert.equal((await(await req('projects')).json()).projects[0].id,p.id);
 const invitation=(await(await req('projects/'+p.id+'/invite',{})).json()).invitation;
 cookie='';await req('session');assert.equal((await req('client-login',{token:new URL(invitation).hash.slice(8)})).status,200,'account-scoped invitation must sign in');
 assert.equal((await req('projects/'+p.id)).status,200);
 await login('producer');await req('accounts',{accountId:a.accountId});await req('projects/'+p.id+'/revoke',{});
 cookie='';await req('session');assert.equal((await req('client-login',{token:new URL(invitation).hash.slice(8)})).status,401,'revoked invitation rejected');
 await login('owner');assert.equal((await req('admin/costs')).status,200);assert.equal((await req('accounts',{accountId:'does-not-exist'})).status,403);
 process.env.PORT67_ADMIN_UIDS='';assert.equal((await req('admin/costs')).status,403,'removed role must take effect on next request');
 disabled=true;assert.equal((await req('projects')).status,401);
 await rm(dir,{recursive:true,force:true});console.log('Account API isolation, producer selection and owner-only costs passed');
}void main();
