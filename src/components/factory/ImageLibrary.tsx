"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, ImagePlus, Trash2 } from "lucide-react";
import type { VideoImage } from "@/lib/factory/model";
import { IMAGE_LABEL, IMAGE_CATEGORIES, slugName } from "@/lib/factory/video-images";
import { api, uploadFile } from "./workspace-api";

// Project image library (CHG-0116): the characters, product, locations and props that prompts refer to as @name.
export type LibraryImage = Omit<VideoImage, "storageKey">;
const src = (cid: string, i: LibraryImage) => `/api/factory/video-images/${cid}/${i.commissionId}/file/${i.id}`;
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function CopyName({ name }: { name: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="f-button secondary small" onClick={async () => { try { await navigator.clipboard.writeText(`@${name}`); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard not available */ } }}><Copy size={14} /> {done ? "Copied" : `Copy @${name}`}</button>;
}

type UploadItem = { file: File; title: string; category: string; description: string };
type ViewProps = {
  cid: string; images: LibraryImage[]; selectedId: string; busy: boolean; progress: string;
  onSelect: (id: string) => void; onFiles: (files: UploadItem[]) => void;
  onSave: (id: string, d: { title: string; category: string; description: string }) => Promise<boolean>; onRemove: (id: string) => void;
};
export function ImageLibraryView({ cid, images, selectedId, busy, progress, onSelect, onFiles, onSave, onRemove }: ViewProps) {
  const input = useRef<HTMLInputElement>(null);

  const [over, setOver] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState<UploadItem[]>([]);
  const [filter, setFilter] = useState("All");
  const visible = images.filter(i => filter === "All" || (i.category || "Uncategorised") === filter);
  const idx = Math.max(0, images.findIndex((i) => i.id === selectedId));
  const sel = images[idx];
  const step = (d: number) => { const pos = visible.findIndex(i => i.id === sel?.id); const n = visible[(pos + d + visible.length) % visible.length]; if (n) { onSelect(n.id); setConfirm(""); } };

  const pick = (list: FileList | null) => { const files = [...(list || [])]; if (files.length && !busy) setPending(prev => [...prev, ...files.map(file => ({ file, title: file.name.replace(/\.[^.]+$/, ""), category: "", description: "" }))]); if (input.current) input.current.value = ""; };
  return (
    <section className={"f-panel w-lib" + (over ? " w-lib-over" : "")} aria-labelledby="vs-lib"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}>
      <div className="f-section-heading">
        <h3 id="vs-lib">Image library</h3>
        <button type="button" className="f-button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={16} /> Upload images</button>
        <input ref={input} type="file" hidden multiple accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" aria-label="Choose images to upload" onChange={(e) => pick(e.target.files)} />
      </div>
      <button type="button" className="w-upload-zone" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={28} aria-hidden="true" /><strong>Drop images here or browse files</strong><span>{IMAGE_LABEL}. Project assets are referenced in prompts as @name.</span></button>
      {pending.length > 0 && <form className="w-upload-queue" onSubmit={e => { e.preventDefault(); onFiles(pending); setPending([]); }}>
        <h4>Prepare images</h4><p className="f-small">Enter a title and category for each image before uploading. Titles become prompt references.</p>
        {pending.map((item, n) => <div className="w-upload-row" key={n}><label className="f-field"><span>Image title</span><input required maxLength={120} value={item.title} onChange={e => setPending(p => p.map((x,j) => j === n ? {...x,title:e.target.value} : x))} /><small>@{slugName(item.title) || "image"}</small></label><label className="f-field"><span>Category</span><select required value={item.category} onChange={e => setPending(p => p.map((x,j) => j === n ? {...x,category:e.target.value} : x))}><option value="">Choose category</option>{IMAGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label><label className="f-field"><span>Description (optional)</span><input maxLength={500} value={item.description} onChange={e => setPending(p => p.map((x,j) => j === n ? {...x,description:e.target.value} : x))} /></label><button type="button" className="f-button secondary small" onClick={() => setPending(p => p.filter((_,j) => j !== n))}>Remove</button></div>)}
        <div className="w-actions"><button className="f-button" disabled={busy || pending.some(i => !i.category || !slugName(i.title))}>Upload {pending.length} images</button><button type="button" className="f-button secondary" onClick={() => setPending([])}>Cancel</button></div>
      </form>}
      {images.length > 0 && <div className="w-asset-filters" aria-label="Filter images">{["All", ...IMAGE_CATEGORIES, "Uncategorised"].map(c => <button type="button" key={c} aria-pressed={filter === c} className="f-button secondary small" onClick={() => { setFilter(c); const first = images.find(i => c === "All" || (i.category || "Uncategorised") === c); if (first) onSelect(first.id); }}>{c}</button>)}</div>}
      {progress && <p className="f-small" role="status">{progress}</p>}
      {images.length === 0 ? (
        <p className="w-lib-empty">No images yet. Upload a picture of a person, the product, a place or a prop.</p>
      ) : (
        <>
          <div className="w-asset-layout"><div className="w-asset-gallery">
            <h4>Project assets <span className="f-small">{visible.length} images</span></h4>{visible.length === 0 && <p className="w-lib-empty">No images in this category yet.</p>}
            <ul className="w-asset-grid" aria-label="Uploaded images">
              {visible.map((i) => (
                <li key={i.id}>
                  <button type="button" className={"w-thumb" + (i.id === sel?.id ? " active" : "")} aria-pressed={i.id === sel?.id} onClick={() => { onSelect(i.id); setConfirm(""); }} title={i.description || i.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src(cid, i)} alt={i.description || i.name} loading="lazy" />
                    <small className="w-asset-tag">{i.category || "Uncategorised"}</small><strong>{i.title || i.name}</strong><span>@{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>

          </div>
          {sel && visible.some(i => i.id === sel.id) && (
            <aside className="w-review" key={sel.id} aria-label="Selected image details"><h4>Selected image</h4>
              <div className="w-review-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src(cid, sel)} alt={sel.description || sel.name} />
                <div className="w-review-nav">
                  <button type="button" className="f-button secondary small" onClick={() => step(-1)} disabled={visible.length < 2}><ChevronLeft size={14} /> Previous</button>
                  <span className="f-small">{visible.findIndex(i => i.id === sel.id) + 1} of {visible.length}</span>
                  <button type="button" className="f-button secondary small" onClick={() => step(1)} disabled={visible.length < 2}>Next <ChevronRight size={14} /></button>
                </div>
              </div>
              <form className="f-form-grid w-onecol" onSubmit={async (e) => { e.preventDefault(); const d = new FormData(e.currentTarget); await onSave(sel.id, { title: String(d.get("title") || ""), category: String(d.get("category") || ""), description: String(d.get("description") || "") }); }}>
                <label className="f-field"><span>Image title</span><input name="title" required maxLength={120} defaultValue={sel.title || sel.name} /></label>
                <label className="f-field"><span>Category</span><select name="category" required defaultValue={sel.category || ""}><option value="">Choose category</option>{IMAGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
                <p className="f-small">Prompt reference: <strong>@{sel.name}</strong>. Changing the title may change the reference.</p>
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
            </aside>
          )}</div>
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

  const upload = async (files: UploadItem[]) => {
    setBusy(true); onError("");
    let last = "", failed = 0;
    let list = images;
    for (let n = 0; n < files.length; n++) {
      setProgress(`Uploading ${n + 1} of ${files.length}: ${files[n].file.name}`);
      try {
        const r = await uploadFile<{ image: LibraryImage }>(`${base}/upload`, files[n].file, { title: files[n].title, category: files[n].category, description: files[n].description });
        list = [...list, r.image]; last = r.image.id; apply(list, last);
      } catch (e) { failed++; onError(`${files[n].file.name}: ${(e as Error).message}`); }
    }
    setProgress(failed ? `${files.length - failed} of ${files.length} uploaded.` : `${files.length} uploaded. Ready to reference in prompts.`);
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
