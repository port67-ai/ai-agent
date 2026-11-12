"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import type { Principal } from "@/lib/factory/model";
import { roleLabel, userInitials, userLabel } from "@/lib/factory/user-display";

/**
 * Standard account menu: avatar in the top bar that opens a small panel with
 * who is signed in and the sign-out action. Closes on outside click and Escape.
 */
export default function UserMenu({
  principal,
  busy,
  onSignOut,
}: {
  principal: Principal;
  busy: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const signOut = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const name = userLabel(principal);
  useEffect(() => {
    if (!open) return;
    signOut.current?.focus();
    const away = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="f-user-menu" ref={wrapper}>
      <button
        ref={trigger}
        type="button"
        className="f-user-trigger"
        aria-label={"Account menu for " + name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="f-avatar" aria-hidden="true">
          {userInitials(principal)}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="f-user-panel" id={panelId} role="menu">
          <div className="f-user-who">
            <span className="f-avatar large" aria-hidden="true">
              {userInitials(principal)}
            </span>
            <div>
              <strong title={name}>{name}</strong>
              <span>{roleLabel(principal)}</span>
            </div>
          </div>
          <button
            ref={signOut}
            type="button"
            role="menuitem"
            className="f-user-item"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
