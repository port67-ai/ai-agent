"use client";
import Link from "next/link";
import { StudioLogo } from "./StudioLogo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export function Navigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        document.getElementById("studio-menu")?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <header className="studio-header">
      <div className="studio-container studio-nav">
        <Link href="/" aria-label="Port67.ai home">
          <StudioLogo />
        </Link>
        <button
          id="studio-menu"
          className="studio-menu"
          aria-expanded={open}
          aria-controls="studio-links"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}{" "}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </button>
        <nav
          id="studio-links"
          aria-label="Main navigation"
          className={open ? "is-open" : ""}
        >
          {["Understand", "Automate", "Explain", "Work", "Process"].map(
            (label) => (
              <Link
                key={label}
                href={"/" + label.toLowerCase() + "/"}
                aria-current={
                  path.replace(/\/$/, "") === "/" + label.toLowerCase()
                    ? "page"
                    : undefined
                }
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ),
          )}
          <Link href="/portal" onClick={() => setOpen(false)}>
            Client workspace
          </Link>
          <Link
            href="/contact/"
            className="studio-button studio-button-small"
            onClick={() => setOpen(false)}
          >
            Discuss a project <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
