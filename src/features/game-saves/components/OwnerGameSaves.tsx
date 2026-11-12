"use client";
import { useState } from "react";
import { Copy, FolderPlus, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { savesApi } from "../api/saves-api";
import { SaveFolderPanel, saveError } from "./SaveFolderPanel";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import styles from "./Saves.module.css";
export function OwnerGameSaves() {
  const query = savesApi.useSaveFoldersQuery();
  const [create, creating] = savesApi.useCreateSaveFolderMutation();
  const [update, updating] = savesApi.useUpdateSaveFolderMutation();
  const [upload] = savesApi.useUploadSaveMutation();
  const [remove] = savesApi.useDeleteSaveMutation();
  const [selected, select] = useState("");
  const [name, setName] = useState("");
  const [rename, setRename] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ folder: string; url: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<"invite" | "revoke" | null>(null);
  const folder = query.data?.find((f) => f.id === selected) || query.data?.[0];
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">YOUR PRIVATE LIBRARY</p>
          <h1>Game saves</h1>
          <p>
            One folder per person. Keep exported progress together, and share
            only the folder you choose.
          </p>
        </div>
        <ShieldCheck size={34} />
      </header>
      <div className={styles.layout}>
        <aside className={styles.folders}>
          <h2>People & folders</h2>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              try {
                const result = await create({ name }).unwrap();
                setName("");
                select(result.id);
              } catch (error) {
                setError(saveError(error));
              }
            }}
          >
            <label className="field">
              Folder name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={60}
                placeholder="e.g. Rowell"
              />
            </label>
            <ActionButton
              className="button secondary"
              pending={creating.isLoading}
              disabled={!name.trim()}
            >
              <FolderPlus size={16} /> Add folder
            </ActionButton>
          </form>
          {query.isLoading && <p role="status">Loading folders…</p>}
          {query.isError && (
            <div role="alert">
              <p>Folders could not load.</p>
              <button
                className="button secondary"
                onClick={() => query.refetch()}
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}
          <nav aria-label="Save folders">
            {query.data?.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={folder?.id === item.id ? "true" : undefined}
                onClick={() => {
                  select(item.id);
                  setRenaming(false);
                  setCopied(false);
                }}
              >
                <strong>{item.name}</strong>
                <small>{item.files.length} backups</small>
              </button>
            ))}
          </nav>
        </aside>
        <div className={styles.main}>
          {folder ? (
            <>
              <section className={styles.sharing} aria-label="Folder access">
                <div>
                  <h2>Private invitation</h2>
                  <p>
                    Anyone with this link can view, download and upload saves in{" "}
                    <strong>{folder.name}</strong>. It expires after 7 days. No
                    account or owner PIN is shared.
                  </p>
                  {folder.inviteExpiresAt && (
                    <small>
                      Current link expires{" "}
                      <time dateTime={folder.inviteExpiresAt}>
                        {new Date(folder.inviteExpiresAt).toLocaleString()}
                      </time>
                    </small>
                  )}
                </div>
                <div className={styles.actions}>
                  <button
                    className="button secondary"
                    disabled={updating.isLoading}
                    onClick={() => setConfirm("invite")}
                  >
                    <Link2 size={15} />{" "}
                    {folder.inviteExpiresAt ? "Replace link" : "Create link"}
                  </button>
                  {folder.inviteExpiresAt && (
                    <button
                      className="button secondary"
                      disabled={updating.isLoading}
                      onClick={() => setConfirm("revoke")}
                    >
                      Revoke link
                    </button>
                  )}
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => {
                      setRename(folder.name);
                      setRenaming(!renaming);
                    }}
                  >
                    Rename folder
                  </button>
                </div>
                {renaming && (
                  <form
                    className={styles.actions}
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setError("");
                      try {
                        await update({
                          id: folder.id,
                          action: "rename",
                          name: rename,
                        }).unwrap();
                        setRenaming(false);
                      } catch (error) {
                        setError(saveError(error));
                      }
                    }}
                  >
                    <label className="field">
                      New folder name
                      <input
                        required
                        value={rename}
                        maxLength={60}
                        onChange={(event) => setRename(event.target.value)}
                      />
                    </label>
                    <ActionButton
                      className="button"
                      pending={updating.isLoading}
                    >
                      Save name
                    </ActionButton>
                  </form>
                )}
                {link?.folder === folder.id && (
                  <div className={styles.invitation}>
                    <label className="field">
                      New private link — copy it now
                      <input
                        readOnly
                        value={link.url}
                        onFocus={(event) => event.target.select()}
                      />
                    </label>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(link.url);
                          setCopied(true);
                        } catch {
                          setError("Select and copy the link above.");
                        }
                      }}
                    >
                      <Copy size={15} /> {copied ? "Copied" : "Copy link"}
                    </button>
                    <small>
                      Keep it private. The full link is shown only when created.
                    </small>
                  </div>
                )}
              </section>
              <SaveFolderPanel
                key={folder.id}
                folder={folder}
                onUpload={(body) =>
                  upload({ folder: folder.id, body }).unwrap()
                }
                onDelete={(file) =>
                  remove({ folder: folder.id, id: file.id }).unwrap()
                }
              />
            </>
          ) : (
            !query.isLoading &&
            !query.isError && (
              <div className={styles.empty}>
                <FolderPlus size={36} />
                <h2>A place for your progress</h2>
                <p>Add your first folder, then upload an exported save.</p>
              </div>
            )
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={
          confirm === "invite"
            ? "Create a private invitation?"
            : "Revoke this invitation?"
        }
        description={
          confirm === "invite"
            ? `Create a 7-day link to ${folder?.name}? Any previous link to this folder stops working. Only share the new link with the intended person.`
            : "The shared link stops working immediately. Stored saves remain in your library."
        }
        label={confirm === "invite" ? "Create private link" : "Revoke link"}
        busy={updating.isLoading}
        onConfirm={async () => {
          if (!folder || !confirm) return;
          setError("");
          try {
            const result = await update({
              id: folder.id,
              action: confirm,
            }).unwrap();
            setLink(
              result.token
                ? {
                    folder: folder.id,
                    url: `${window.location.origin}/saves/shared#${result.token}`,
                  }
                : null,
            );
            setCopied(false);
            setConfirm(null);
          } catch (error) {
            setError(saveError(error));
          }
        }}
      />
    </div>
  );
}
