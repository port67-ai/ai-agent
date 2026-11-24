import type { ReactNode } from "react";

// Turns the dossier's plain text (paragraphs, "*" or "-" bullets, **bold**, [Source] tags) into readable markup. No HTML is ever taken from the text.
const TAG = /\[([^\]\n]{1,40})\]/g;
const BASIS = new Set(["stated by the brand", "inference"]);

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  const bold = (s: string, k: string): ReactNode[] => s.split(/\*\*([^*]+)\*\*/g).map((p, i) => (i % 2 ? <strong key={`${k}b${i}`}>{p}</strong> : p));
  for (const m of text.matchAll(TAG)) {
    out.push(...bold(text.slice(last, m.index), `${keyBase}t${n}`));
    const label = m[1];
    out.push(<span key={`${keyBase}s${n++}`} className={"w-src" + (BASIS.has(label.toLowerCase()) ? " w-basis-" + (label.toLowerCase() === "inference" ? "inf" : "stated") : "")}>{label}</span>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(...bold(text.slice(last), `${keyBase}e`));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = (k: number) => { if (items.length) { const list = items; items = []; blocks.push(<ul key={`u${k}`} className="w-rich-list">{list.map((t, i) => <li key={i}>{inline(t, `u${k}-${i}`)}</li>)}</ul>); } };
  text.split(/\r?\n/).forEach((raw, k) => {
    const line = raw.trim();
    const bullet = /^[*\-•]\s+(.*)$/.exec(line);
    if (bullet) { items.push(bullet[1]); return; }
    flush(k);
    if (line) blocks.push(<p key={`p${k}`}>{inline(line, `p${k}`)}</p>);
  });
  flush(9999);
  return <div className="w-rich">{blocks}</div>;
}
