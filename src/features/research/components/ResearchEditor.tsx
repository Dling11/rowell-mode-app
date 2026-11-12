"use client";
import { useRef, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Save, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import Link from "@/components/ui/AppLink";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import { uploadsApi } from "@/features/uploads/api/uploads-api";
import { researchApi } from "../api/research-api";
import { emptyResearch, researchFields, researchStatuses, type ResearchFields, type ResearchItem } from "../model/schema";
import dialog from "@/components/ui/Dialog.module.css";
import styles from "./Research.module.css";

export function ResearchEditor({ item, onClose, onSaved }: { item: ResearchItem | null; onClose: () => void; onSaved: (item: ResearchItem) => void }) {
  const [initial, setInitial] = useState<ResearchFields>(() => item ? Object.fromEntries(Object.keys(emptyResearch).map((key) => [key, item[key as keyof ResearchFields]])) as ResearchFields : { ...emptyResearch });
  const [draft, setDraft] = useState(initial);
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoPage, setPhotoPage] = useState(1);
  const photos = uploadsApi.useMediaQuery(photoPage, { skip: !photosOpen });
  const [save, { isLoading: busy }] = researchApi.useSaveResearchMutation();
  const returnFocus = useRef<HTMLElement | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || tagText !== initial.tags.join(", ");
  function close() { if (!busy) { if (dirty) setDiscard(true); else onClose(); } }
  function change<K extends keyof ResearchFields>(field: K, value: ResearchFields[K]) { setDraft((previous) => ({ ...previous, [field]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = researchFields.safeParse({ ...draft, tags: [...new Set(tagText.split(",").map((tag) => tag.trim()).filter(Boolean))] });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the form fields."); return; }
    setError("");
    try {
      const saved = await save({ ...parsed.data, ...(item ? { id: item.id, updatedAt: item.updatedAt } : {}) }).unwrap();
      setInitial(parsed.data);
      toast.success("Research entry saved");
      onSaved(saved);
    } catch (error) { const message = errorMessage(error); setError(message); toast.error(message); }
  }
  return <>
    <Dialog.Root open onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Portal><Dialog.Overlay className={dialog.overlay}/><Dialog.Content className={`${dialog.content} ${styles.editor}`} onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }} onEscapeKeyDown={(event) => { event.preventDefault(); close(); }} onPointerDownOutside={(event) => { event.preventDefault(); close(); }}>
        <Dialog.Title className={dialog.title}>{item ? "Edit research entry" : "Save something for later"}</Dialog.Title>
        <Dialog.Description className={dialog.description}>Keep the link, your plans and the details you’ll want when you return. Private to your workspace.</Dialog.Description>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.fields}>
            <label className="field">Title<input required maxLength={120} value={draft.title} onChange={(event) => change("title", event.target.value)} disabled={busy}/></label>
            <label className="field">GitHub repository<input type="url" required maxLength={240} placeholder="https://github.com/owner/project" value={draft.repositoryUrl} onChange={(event) => change("repositoryUrl", event.target.value)} disabled={busy}/></label>
            <label className="field">Stage<select value={draft.status} onChange={(event) => change("status", event.target.value as ResearchFields["status"])} disabled={busy}>{researchStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="field">Tags<input maxLength={270} placeholder="Rust, Downloads, Desktop" value={tagText} onChange={(event) => setTagText(event.target.value)} disabled={busy}/><small>Separate tags with commas.</small></label>
          </div>
          <label className="field">Short description<textarea maxLength={700} rows={3} value={draft.summary} onChange={(event) => change("summary", event.target.value)} disabled={busy}/></label>
          <label className="field">Why I saved this & next steps<textarea maxLength={12000} value={draft.notes} onChange={(event) => change("notes", event.target.value)} disabled={busy}/></label>
          <details><summary>Setup & review notes</summary><div className={styles.form}>
            <label className="field">Setup notes<textarea maxLength={8000} value={draft.setupNotes} onChange={(event) => change("setupNotes", event.target.value)} disabled={busy}/></label>
            <label className="field">Safety & license review<textarea maxLength={8000} value={draft.reviewNotes} onChange={(event) => change("reviewNotes", event.target.value)} disabled={busy}/></label>
            <div className={styles.fields}><label className="field">License<input maxLength={100} value={draft.license} onChange={(event) => change("license", event.target.value)} disabled={busy}/></label><label className="field">Website / documentation<input type="url" maxLength={1500} value={draft.websiteUrl} onChange={(event) => change("websiteUrl", event.target.value)} disabled={busy}/></label></div>
          </div></details>
          <details onToggle={(event) => setPhotosOpen(event.currentTarget.open)}><summary>Source snapshot & screenshot</summary><div className={styles.form}>
            <label className="field">Local source folder<input maxLength={400} value={draft.localPath} onChange={(event) => change("localPath", event.target.value)} disabled={busy}/></label>
            <div className={styles.fields}><label className="field">Saved source version<input maxLength={80} value={draft.snapshotVersion} onChange={(event) => change("snapshotVersion", event.target.value)} disabled={busy}/></label><label className="field">Saved source commit<input maxLength={40} placeholder="Full commit SHA (optional)" value={draft.snapshotCommit} onChange={(event) => change("snapshotCommit", event.target.value)} disabled={busy}/></label></div>
            <label className="field">Upstream screenshot URL<input type="url" maxLength={1500} placeholder="https://raw.githubusercontent.com/…/image.webp" value={draft.screenshotUrl} onChange={(event) => change("screenshotUrl", event.target.value)} disabled={busy}/></label>
            <label className="field">Or choose a library photo<select value={draft.screenshotMediaId || ""} onChange={(event) => change("screenshotMediaId", event.target.value || null)} disabled={busy || photos.isLoading}><option value="">Use the upstream link / no library photo</option>{draft.screenshotMediaId && !photos.data?.items.some((photo) => photo.id === draft.screenshotMediaId) && <option value={draft.screenshotMediaId}>Current selected photo</option>}{photos.data?.items.map((photo) => <option key={photo.id} value={photo.id}>{photo.caption || photo.alt || photo.name}</option>)}</select></label>
            {photos.error && <p role="alert" className="error-text">The photo list couldn’t load. Your current selection is kept.</p>}
            <div className={styles.actions}><button type="button" className="button secondary" disabled={busy || photoPage === 1} onClick={() => setPhotoPage((page) => page - 1)}>Previous photos</button><button type="button" className="button secondary" disabled={busy || !photos.data?.nextPage} onClick={() => setPhotoPage(photos.data!.nextPage!)}>More photos</button><button type="button" className="text-link" disabled={busy || photos.isFetching} onClick={() => photos.refetch()}>Refresh photos</button><Link href="/admin/uploads" target="_blank" className="text-link"><ImagePlus size={15}/> Upload a screenshot</Link></div>
          </div></details>
          {error && <p className="error-text" role="alert">{error}</p>}
          <div className={styles.actions}><ActionButton pending={busy} className="button" disabled={busy || !dirty}><Save size={15}/>Save entry</ActionButton><button type="button" className="button secondary" onClick={close} disabled={busy}>Cancel</button></div>
        </form>
        <button className={dialog.close} aria-label="Close research editor" onClick={close} disabled={busy}><X size={18}/></button>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <UnsavedChangesGuard dirty={dirty && !busy}/>
    <ConfirmDialog open={discard} onOpenChange={setDiscard} title="Discard these edits?" description="Your latest changes haven’t been saved." label="Discard edits" onConfirm={onClose}/>
  </>;
}
