import assert from "node:assert/strict";
async function main() {
  // Importing dormant legacy modules must not initialise an unconfigured SDK during Factory builds.
  const { firebaseAuth } = await import("../src/lib/services/firebase-auth");
  const { firebaseDb } = await import("../src/lib/services/firebase-db");
  assert.equal(typeof firebaseAuth.signIn, "function");
  assert.equal(typeof firebaseDb.getUser, "function");
  await assert.rejects(
    () => firebaseAuth.signIn("test@example.com", "not-a-secret"),
    /Firebase.*configured/,
  );
  console.log(
    "Legacy Firebase: imports are inert; unconfigured use fails explicitly.",
  );
}
void main();
async function dormantRoute(){
const messages:unknown[]=[];const original=console.error;console.error=(...args:unknown[])=>{messages.push(args);};
try{const {GET}=await import('../src/app/api/users/route');const {NextRequest}=await import('next/server');const response=await GET(new NextRequest('http://localhost/api/users'));assert.equal(response.status,401);assert.equal(messages.length,0,'unauthenticated legacy import/request must not initialise missing Firebase credentials');}finally{console.error=original;}}
void dormantRoute();
