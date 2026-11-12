"use client";
import { useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, inMemoryPersistence, reload, sendEmailVerification, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";

export function AccountLogin({ onAuthenticated }: { onAuthenticated: (idToken: string) => Promise<void> }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [verification, setVerification] = useState(false);
  const [message, setMessage] = useState("");
  async function authClient() {
    const response = await fetch("/api/factory/auth-config", { cache: "no-store" });
    if (!response.ok) throw new Error("Unavailable");
    const config = await response.json();
    if (config.projectId !== "ai-agency-3671b" || !config.apiKey || !config.authDomain) throw new Error("Unavailable");
    const app = getApps().find((item) => item.name === "port67-account") || initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId }, "port67-account");
    const auth = getAuth(app);
    await setPersistence(auth, inMemoryPersistence);
    return auth;
  }
  async function run(action: "submit" | "refresh" | "resend") {
    setPending(true); setMessage("");
    try {
      const auth = await authClient();
      if (action === "submit") {
        const result = mode === "signup" ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
        setPassword("");
        if (!result.user.emailVerified) {
          setVerification(true);
          if (mode === "signup") await sendEmailVerification(result.user);
          setMessage("Verify your email to open your account. Check your inbox, then select Check verification.");
          return;
        }
      }
      if (!auth.currentUser) { setVerification(false); throw new Error("Sign in again"); }
      if (action === "resend") {
        await sendEmailVerification(auth.currentUser);
        setMessage("Verification email requested. Check your inbox."); return;
      }
      await reload(auth.currentUser);
      if (!auth.currentUser.emailVerified) { setVerification(true); setMessage("Your email is still awaiting verification."); return; }
      const token = await auth.currentUser.getIdToken(true);
      try { await onAuthenticated(token); }
      finally { await signOut(auth); }
      setVerification(false);
    } catch {
      setPassword("");
      setMessage("We could not complete that request. Check your details and try again, or verify your email first.");
    } finally { setPending(false); }
  }
  return <section className="f-account-login">
    <h2 className="">{mode === "signin" ? "Sign in to your account" : "Create your account"}</h2>
    <p className="f-small">Keep your research, builds and assets together under your own account.</p>
    <form className="f-account-form" onSubmit={(event) => { event.preventDefault(); void run("submit"); }}>
      <label className="block text-sm">Email<input className="" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} /></label>
      <label className="block text-sm">Password<input className="" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} /></label>
      <button className="f-button" disabled={pending}>{pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
    {verification && <div className="mt-3 flex gap-3"><button disabled={pending} onClick={() => void run("refresh")}>Check verification</button><button disabled={pending} onClick={() => void run("resend")}>Resend email</button></div>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    <button className="f-text-button" disabled={pending} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Create an account" : "Already have an account? Sign in"}</button>
  </section>;
}
