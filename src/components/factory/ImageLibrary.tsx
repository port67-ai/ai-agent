"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, ImagePlus, Trash2 } from "lucide-react";
import type { VideoImage } from "@/lib/factory/model";
import { IMAGE_LABEL, NAME_RULE } from "@/lib/factory/video-images";
import { api, uploadFile } from "./workspace-api";

// Project image library (CHG-0116): the characters, product, locations and props that prompts refer to as @name.
export type LibraryImage = Omit<VideoImage, "storageKey">;
const src = (cid: string, i: LibraryImage) => `/api/factory/video-images/${cid}/${i.commissionId}/file/${i.id}`;
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function CopyName({ name }: { name: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="f-button secondary small" onClick={async () => { try { await navigator.clipboard.writeText(`@${name}`); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard not available */ } }}><Copy size={14} /> {done ? "Copied" : `Copy @${name}`}</button>;
}

type ViewProps = {
  cid: string; images: LibraryImage[]; selectedId: string; busy: boolean; progress: string;
  onSelect: (id: string) => void; onFiles: (files: File[]) => void;
  onSave: (id: string, d: { name: string; description: string }) => Promise<boolean>; onRemove: (id: string) => void;
};
export function ImageLibraryView({ cid, images, selectedId, busy, progress, onSelect, onFiles, onSave, onRemove }: ViewProps) {
  const input = useRef<HTMLInputElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const [over, setOver] = useState(false);
  const [confirm, setConfirm] = useState("");
  const idx = Math.max(0, images.findIndex((i) => i.id === selectedId));
  const sel = images[idx];
  const step = (d: number) => { const n = images[(idx + d + images.length) % images.length]; if (n) { onSelect(n.id); setConfirm(""); } };
  const scroll = (d: number) => strip.current?.scrollBy({ left: d * 360, behavior: "smooth" });
  const pick = (list: FileList | null) => { const files = [...(list || [])]; if (files.length) onFiles(files); if (input.current) input.current.value = ""; };
  return (
    <section className={"f-panel w-lib" + (over ? " w-lib-over" : "")} aria-labelledby="vs-lib"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}>
      <div className="f-section-heading">
        <h3 id="vs-lib">Image library</h3>
        <button type="button" className="f-button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16} /> Upload images</button>
        <input ref={input} type="file" hidden multiple accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" aria-label="Choose images to upload" onChange={(e) => pick(e.target.files)} />
      </div>
      <p className="f-small">Characters, the product, locations and props for this project only. Each image is called by its name in prompts, as @name. Drop files here or press Upload. {IMAGE_LABEL}.</p>
      {progress && <p className="f-small" role="status">{progress}</p>}
      {images.length === 0 ? (
        <p className="w-lib-empty">No images yet. Upload a picture of a person, the product, a place or a prop.</p>
      ) : (
        <>
          <div className="w-carousel">
            <button type="button" className="w-car-arrow" aria-label="Scroll images left" onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
            <ul className="w-strip" ref={strip} aria-label="Uploaded images">
              {images.map((i) => (
                <li key={i.id}>
                  <button type="button" className={"w-thumb" + (i.id === sel?.id ? " active" : "")} aria-pressed={i.id === sel?.id} onClick={() => { onSelect(i.id); setConfirm(""); }} title={i.description || i.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(cid, i)} alt={i.description || i.name} loading="lazy" />
                    <span>@{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="w-car-arrow" aria-label="Scroll images right" onClick={() => scroll(1)}><ChevronRight size={18} /></button>
          </div>
          {sel && (
            <div className="w-review" key={sel.id}>
              <div className="w-review-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src(cid, sel)} alt={sel.description || sel.name} />
                <div className="w-review-nav">
                  <button type="button" className="f-button secondary small" onClick={() => step(-1)} disabled={images.length < 2}><ChevronLeft size={14} /> Previous</button>
                  <span className="f-small">{idx + 1} of {images.length}</span>
                  <button type="button" className="f-button secondary small" onClick={() => step(1)} disabled={images.length < 2}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
              <form className="f-form-grid w-onecol" onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); await onSave(sel.id, { name: String(d.get("name") || ""), description: String(d.get("description") || "") }); }}>
                <label className="f-field"><span>Name (used as @name in prompts)</span>
                  <input name="name" required maxLength={41} pattern="@?[A-Za-z0-9_\-]{1,40}" defaultValue={`@${sel.name}`} title={NAME_RULE} />
                </label>
                <label className="f-field"><span>Description (optional)</span>
                  <textarea name="description" rows={3} maxLength={500} defaultValue={sel.description} placeholder="For example, Maya, 30s, baker, flour on her apron" />
                </label>
                <p className="f-small">{sel.mime.replace("image/", "").toUpperCase()}, {size(sel.bytes)}, added {sel.uploadedAt.slice(0, 10)}.</p>
                <div className="w-actions">
                  <button className="f-button" disabled={busy}>Save</button>
                  <CopyName name={sel.name} />
                  {confirm === sel.id
                    ? <><button type="button" className="f-button danger small" disabled={busy} onClick={() => { setConfirm(""); onRemove(sel.id); }}>Yes, delete @{sel.name}</button><button type="button" className="f-button secondary small" onClick={() => setConfirm("")}>Keep</button></>
                    : <button type="button" className="f-button secondary small" disabled={busy} onClick={() => setConfirm(sel.id)}><Trash2 size={14} /> Delete</button>}
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Loads and edits the library for one project. `onChange` tells the page when the set of names changed. */
export function ImageLibrary({ cid, commissionId, onChange, onError }: { cid: string; commissionId: string; onChange?: (images: LibraryImage[]) => void; onError: (message: string) => void }) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const base = `video-images/${cid}/${commissionId}`;
  const apply = useCallback((list: LibraryImage[], pick?: string) => { setImages(list); setSelected((cur) => (pick && list.some((i) => i.id === pick) ? pick : list.some((i) => i.id === cur) ? cur : list[0]?.id || "")); onChange?.(list); }, [onChange]);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try { const d = await api<{ images: LibraryImage[] }>(base); if (alive) apply(d.images); }
      catch (e) { if (alive) onError((e as Error).message); }
    })();
    return () => { alive = false; };
  }, [base, apply, onError]);

  const upload = async (files: File[]) => {
    setBusy(true); onError("");
    let last = "", failed = 0;
    let list = images;
    for (let n = 0; n < files.length; n++) {
      setProgress(`Uploading ${n + 1} of ${files.length}: ${files[n].name}`);
      try {
        const r = await uploadFile<{ image: LibraryImage }>(`${base}/upload`, files[n], { name: files[n].name });
        list = [...list, r.image]; last = r.image.id; apply(list, last);
      } catch (e) { failed++; onError(`${files[n].name}: ${(e as Error).message}`); }
    }
    setProgress(failed ? `${files.length - failed} of ${files.length} uploaded.` : `${files.length} uploaded. Rename them below so prompts can use clear @names.`);
    setBusy(false);
  };
  const act = async (payload: Record<string, unknown>): Promise<boolean> => {
    setBusy(true); onError("");
    try { const d = await api<{ images: LibraryImage[] }>(base, payload); apply(d.images); setProgress(payload.action === "remove" ? "Image deleted." : "Saved."); return true; }
    catch (e) { onError((e as Error).message); return false; }
    finally { setBusy(false); }
  };
  return <ImageLibraryView cid={cid} images={images} selectedId={selected} busy={busy} progress={progress} onSelect={setSelected} onFiles={(f) => void upload(f)}
    onSave={(id, d) => act({ action: "update", id, ...d })} onRemove={(id) => void act({ action: "remove", id })} />;
}
