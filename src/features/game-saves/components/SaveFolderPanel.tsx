"use client";
import { useRef, useState } from "react";
import { Archive, Download, FolderOpen, Trash2, Upload, X } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  gameNames,
  MAX_SAVE_BYTES,
  type SaveFile,
  type SaveFolder,
} from "../model/schema";
import { validateSaveFile } from "../model/archive";
import styles from "./Saves.module.css";

export function saveError(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data;
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
    )
      return data.error;
  }
  return error instanceof Error
    ? error.message
    : "This did not finish. Please try again.";
}
export async function saveResponse(response: Response) {
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "This did not finish. Please try again.");
  return data;
}
export const saveSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
export function SaveFolderPanel({
  folder,
  onUpload,
  onDelete,
  onDownload,
}: {
  folder: SaveFolder;
  onUpload: (body: FormData) => Promise<unknown>;
  onDelete?: (file: SaveFile) => Promise<unknown>;
  onDownload?: (file: SaveFile) => Promise<void>;
}) {
  const [game, setGame] = useState<keyof typeof gameNames>("mh-tri");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<SaveFile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    folderInput = useRef<HTMLInputElement>(null);
  async function choose(files: FileList | null, directory = false) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    setSelected(null);
    setUploadId("");
    try {
      let file: File;
      if (directory) {
        const entries: Record<string, Uint8Array> = {};
        let total = 0;
        if (files.length > 256)
          throw new Error(
            "Choose only the exported save folder, not the full app folder.",
          );
        for (const entry of Array.from(files)) {
          total += entry.size;
          if (total > MAX_SAVE_BYTES)
            throw new Error(
              "Choose a save folder up to 4 MB, without game images or apps.",
            );
          const path =
            entry.webkitRelativePath.split("/").slice(1).join("/") ||
            entry.name;
          if (Object.hasOwn(entries, path))
            throw new Error("The folder contains duplicate names.");
          entries[path] = new Uint8Array(await entry.arrayBuffer());
        }
        const { zipSync } = await import("fflate");
        const bytes = zipSync(entries, { level: 0 });
        const name = `${files[0].webkitRelativePath.split("/")[0] || "game-save"}.zip`;
        file = new File([new Uint8Array(bytes)], name, {
          type: "application/zip",
        });
      } else file = files[0];
      if (file.size > MAX_SAVE_BYTES)
        throw new Error(
          "Save backups can be up to 4 MB. Game images and apps are not supported.",
        );
      validateSaveFile(file.name, new Uint8Array(await file.arrayBuffer()));
      setSelected(file);
      setUploadId(crypto.randomUUID());
    } catch (error) {
      setError(saveError(error));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
      if (folderInput.current) folderInput.current.value = "";
    }
  }
  async function upload() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", selected);
      body.set("id", uploadId);
      body.set("game", game);
      body.set("title", title.trim() || `${gameNames[game]} backup`);
      await onUpload(body);
      setSelected(null);
      setTitle("");
      setNotice(
        "Backup stored. Your game and existing copies have not changed.",
      );
    } catch (error) {
      setError(saveError(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel} aria-label={`${folder.name} saves`}>
      <header className={styles.folderHeader}>
        <div>
          <p className="eyebrow">PRIVATE SAVE FOLDER</p>
          <h2>
            <FolderOpen size={24} /> {folder.name}
          </h2>
        </div>
        <small>
          {folder.files.length} / 25 backups · {saveSize(folder.bytes)}
        </small>
      </header>
      <p className={styles.hint}>
        Save inside the game first, then export it. Upload that export here to
        keep a separate copy. This does not capture a live game or restore
        progress automatically.
      </p>
      <form
        className={styles.upload}
        onSubmit={(event) => {
          event.preventDefault();
          void upload();
        }}
      >
        <div className={styles.fields}>
          <label className="field">
            Game
            <select
              value={game}
              disabled={busy}
              onChange={(event) => setGame(event.target.value as typeof game)}
            >
              {Object.entries(gameNames).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Backup label <span className="sr-only">optional</span>
            <input
              maxLength={80}
              value={title}
              disabled={busy}
              placeholder="e.g. Before urgent quest"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <input
            ref={fileInput}
            className="sr-only"
            tabIndex={-1}
            type="file"
            aria-label="Select exported save file"
            accept=".zip,.bin,.sav,.dat"
            disabled={busy}
            onChange={(event) => void choose(event.target.files)}
          />
          <input
            ref={(element) => {
              folderInput.current = element;
              element?.setAttribute("webkitdirectory", "");
            }}
            className="sr-only"
            tabIndex={-1}
            type="file"
            aria-label="Select exported save folder"
            multiple
            disabled={busy}
            onChange={(event) => void choose(event.target.files, true)}
          />
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Archive size={16} /> Choose save file
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => folderInput.current?.click()}
          >
            <FolderOpen size={16} /> Choose save folder
          </button>
        </div>
        <small className={styles.hint}>
          Save ZIPs or system / user save files · Up to 4 MB each · A selected
          folder is packed into one ZIP. No ROMs, game data or APKs.
        </small>
        {selected && (
          <div className={styles.selection}>
            <div>
              <strong>{selected.name}</strong>
              <small>{saveSize(selected.size)} · Ready to upload</small>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              disabled={busy}
              aria-label="Remove selected file"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <ActionButton
          type="submit"
          className="button"
          pending={busy}
          disabled={!selected || folder.files.length >= 25}
        >
          <Upload size={16} /> {busy ? "Working…" : "Upload backup"}
        </ActionButton>
      </form>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.success}>
          {notice}
        </p>
      )}
      <div className={styles.backups}>
        <h3>Stored backups</h3>
        <p className={styles.hint}>
          Times use this device’s local timezone. Download a copy, then import
          it from your game app’s Saves menu.
        </p>
        {!folder.files.length && (
          <div className={styles.empty}>
            <Archive size={30} />
            <p>No backups yet. Choose your exported save above.</p>
          </div>
        )}
        {[...folder.files].reverse().map((file) => (
          <article key={file.id} className={styles.file}>
            <div className={styles.fileDetails}>
              <strong>{file.title}</strong>
              <span>
                {gameNames[file.game]} · {saveSize(file.bytes)}
              </span>
              <time dateTime={file.createdAt} suppressHydrationWarning>
                {new Date(file.createdAt).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZoneName: "short",
                })}
              </time>
              <small>{file.name}</small>
              <details>
                <summary>File verification</summary>
                <code>SHA-256: {file.sha256}</code>
              </details>
            </div>
            <div className={styles.actions}>
              {onDownload ? (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await onDownload(file);
                    } catch (error) {
                      setError(saveError(error));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Download size={15} /> Download
                </button>
              ) : (
                <a
                  className="button secondary"
                  href={`/api/admin/game-saves/${folder.id}/files/${file.id}`}
                  download
                >
                  <Download size={15} /> Download
                </a>
              )}
              {onDelete && (
                <button
                  type="button"
                  className={styles.iconButton}
                  disabled={busy}
                  aria-label={`Delete backup ${file.title}`}
                  onClick={() => setDeleting(file)}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this stored backup?"
        description={`Remove “${deleting?.title}” from this private folder? Your game and files on your devices stay unchanged.`}
        label="Delete backup"
        busy={busy}
        onConfirm={async () => {
          if (!deleting || !onDelete) return;
          setBusy(true);
          setError("");
          try {
            await onDelete(deleting);
            setDeleting(null);
            setNotice("Stored backup deleted.");
          } catch (error) {
            setError(saveError(error));
          } finally {
            setBusy(false);
          }
        }}
      />
    </section>
  );
}
