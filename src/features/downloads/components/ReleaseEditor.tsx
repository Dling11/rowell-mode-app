"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { releasesApi } from "@/features/downloads/api/releases-api";
import type { ReleasePointer } from "@/features/downloads/model/release-schema";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QueryState } from "@/components/ui/QueryState";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/Workspace.module.css";

export function ReleaseEditor() {
  const query = releasesApi.useReleasesQuery();
  const [approve, { isLoading }] = releasesApi.useApproveReleaseMutation();
  const [pointer, setPointer] = useState<ReleasePointer>({
    projectId: "mh-tri",
    platform: "android",
    tag: "",
    asset: "",
  });
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setError("");
    try {
      await approve(pointer).unwrap();
      setConfirm(false);
      toast.success("Published asset verified and approved");
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
      setConfirm(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2>Approved download pointers</h2>
      <p>
        Manual pins only. Prereleases are supported; arbitrary “latest” releases
        aren’t promoted. MH4U stays source only.
      </p>
      <QueryState
        loading={query.isLoading} fetching={query.isFetching}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <div className={styles.rows}>
          {query.data.map((release) => (
            <div
              className={styles.row}
              key={`${release.projectId}:${release.platform}`}
            >
              <span>
                {release.projectId} / {release.platform}
                <small
                  style={{
                    display: "block",
                    color: "var(--muted)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {release.pointer.tag} · {release.pointer.asset}
                </small>
              </span>
              <button
                className="button secondary"
                onClick={() => setPointer(release.pointer)}
              >
                Edit pin
              </button>
            </div>
          ))}
        </div>
      )}
      <form
        className={styles.form}
        style={{ marginTop: 25 }}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setConfirm(true);
        }}
      >
        <div className={styles.formRow}>
          <label className="field">
            Project
            <select
              value={pointer.projectId}
              onChange={(e) =>
                setPointer({
                  ...pointer,
                  projectId: e.target.value as ReleasePointer["projectId"],
                  tag: "",
                  asset: "",
                })
              }
            >
              <option value="mh-tri">MH Tri</option>
              <option value="share-mode">Share Mode</option>
            </select>
          </label>
          <label className="field">
            Platform
            <select
              value={pointer.platform}
              onChange={(e) =>
                setPointer({
                  ...pointer,
                  platform: e.target.value as ReleasePointer["platform"],
                  asset: "",
                })
              }
            >
              <option value="android">Android APK</option>
              <option value="windows">Windows ZIP</option>
            </select>
          </label>
        </div>
        <label className="field">
          Published release tag
          <input
            required
            maxLength={80}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            value={pointer.tag}
            onChange={(e) => setPointer({ ...pointer, tag: e.target.value })}
            placeholder="Exact release tag"
          />
        </label>
        <label className="field">
          Published asset filename
          <input
            required
            maxLength={150}
            pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
            value={pointer.asset}
            onChange={(e) => setPointer({ ...pointer, asset: e.target.value })}
            placeholder={
              pointer.platform === "android"
                ? "Exact filename.apk"
                : "Exact filename.zip"
            }
          />
        </label>
        <p>
          The server checks the project’s GitHub repository, published tag,
          asset filename and download URL before saving. Pauses remain in force.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <ActionButton pending={isLoading} className="button" disabled={isLoading}>
          Verify & approve this asset
        </ActionButton>
      </form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Approve this public release?"
        description={`The ${pointer.platform} download for ${pointer.projectId} will point to ${pointer.tag} after GitHub verification.`}
        label="Verify and approve"
        busy={isLoading}
        onConfirm={save}
      />
    </section>
  );
}
