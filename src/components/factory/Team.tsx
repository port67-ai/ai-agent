"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import type { TeamMember } from "@/lib/factory/model";

async function call(body?: unknown): Promise<TeamMember[]> {
  const response = await fetch("/api/factory/admin/team", {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data.team;
}
const roles = [
  {
    name: "Admin",
    who: "You, the owner",
    can: "Everything below, plus this Team page and the private API cost view. Set once in Render with PORT67_ADMIN_UIDS.",
  },
  {
    name: "Producer",
    who: "Port67 staff, added below",
    can: "Open any client account, run research, build direction and production, and review assets. Cannot see costs or this page.",
  },
  {
    name: "Client",
    who: "Anyone who signs up and verifies their email",
    can: "Their own account only: briefs, research they are shown, direction approval and approved assets.",
  },
];
export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    call()
      .then((t) => active && setTeam(t))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  async function change(body: unknown, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setTeam(await call(body));
      setNotice(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="f-panel">
        <div className="f-section-heading">
          <h2>Who can do what</h2>
          <Users size={18} />
        </div>
        <div className="f-roles">
          {roles.map((r) => (
            <div key={r.name} className="f-role">
              <strong>{r.name}</strong>
              <span>{r.who}</span>
              <p>{r.can}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="f-panel f-team">
        <div className="f-section-heading">
          <h2>Producers</h2>
          <ShieldCheck size={18} />
        </div>
        <p className="f-small">
          Add a colleague by the email they will sign up with. They create their
          own account at this portal and verify that email; access starts on their
          next page load. Removing someone ends their producer access on their next
          request.
        </p>
        <form
          className="f-team-form"
          onSubmit={(e) => {
            e.preventDefault();
            void change({ action: "add", email }, "Producer added").then(
              (ok) => ok && setEmail(""),
            );
          }}
        >
          <label>
            Colleague email
            <input
              type="email"
              required
              autoComplete="off"
              maxLength={254}
              placeholder="name@port67.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <button className="f-button small" disabled={busy || !email.trim()}>
            <UserPlus size={16} /> Add producer
          </button>
        </form>
        {error && (
          <p className="f-team-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="f-team-ok" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <p className="f-small">Loading team…</p>
        ) : team.length === 0 ? (
          <p className="f-small">No producers yet. Only admins can act as producers.</p>
        ) : (
          <ul className="f-team-list">
            {team.map((m) => (
              <li key={m.email}>
                <div>
                  <strong>{m.email}</strong>
                  <span>Added {m.addedAt.slice(0, 10)}</span>
                </div>
                <button
                  className="f-text-button"
                  disabled={busy}
                  aria-label={"Remove " + m.email}
                  onClick={() => {
                    if (window.confirm("Remove producer access for " + m.email + "?"))
                      void change({ action: "remove", email: m.email }, "Producer removed");
                  }}
                >
                  <Trash2 size={15} /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
