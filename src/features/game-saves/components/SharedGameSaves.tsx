"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ShieldCheck } from "lucide-react";
import { SaveFolderPanel, saveError, saveResponse } from "./SaveFolderPanel";
import type { SaveFolder } from "../model/schema";
import styles from "./Saves.module.css";
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
export function SharedGameSaves() {
  const token = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const valid = /^[A-Za-z0-9_-]{43}$/.test(token);
  const [result, setResult] = useState<{
    token: string;
    folder?: SaveFolder;
    error?: string;
  } | null>(null);
  const folder = result?.token === token ? result.folder : undefined;
  const error = !valid
    ? "Open the complete private invitation link, including the part after #."
    : result?.token === token
      ? result.error
      : "";
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    fetch("/api/game-saves/shared", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(saveResponse)
      .then((folder) => {
        if (!controller.signal.aborted) setResult({ token, folder });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({ token, error: saveError(error) });
      });
    return () => controller.abort();
  }, [token, valid]);
  const headers = { Authorization: `Bearer ${token}` };
  return (
    <div className={styles.shared}>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">PRIVATE INVITATION</p>
          <h1>Your game saves</h1>
          <p>
            This link opens one person’s folder. Keep it private. It never
            grants access to the owner workspace.
          </p>
        </div>
        <ShieldCheck size={34} />
      </header>
      {valid && result?.token !== token && (
        <p role="status">Opening your private folder…</p>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {folder && (
        <SaveFolderPanel
          key={token}
          folder={folder}
          onUpload={async (body) => {
            const updated = await saveResponse(
              await fetch("/api/game-saves/shared", {
                method: "POST",
                headers,
                body,
                cache: "no-store",
              }),
            );
            setResult({ token, folder: updated });
          }}
          onDownload={async (file) => {
            const response = await fetch(`/api/game-saves/shared/${file.id}`, {
              headers,
              cache: "no-store",
            });
            if (!response.ok) {
              await saveResponse(response);
              return;
            }
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = file.name;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
          }}
        />
      )}
    </div>
  );
}
