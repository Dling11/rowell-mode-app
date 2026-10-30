"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "@/components/ui/AppLink";
import { Globe, Lock, Plus } from "lucide-react";
import { notesApi } from "../api/notes-api";
import type { Note } from "../model/schema";
import type { ComposerProps } from "@/lib/composer";
import { projects } from "@/data/projects";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/QuickComposer.module.css";

export function QuickNoteForm({
  onStateChange,
  onSaved,
  onDone,
}: ComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState("personal");
  const [status, setStatus] = useState("In progress");
  const [saved, setSaved] = useState<Note | null>(null);
  const [finished, setFinished] = useState<"private" | "public" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [save] = notesApi.useSaveNoteMutation();
  const [publish] = notesApi.usePublishNoteMutation();
  const dirty =
    !finished &&
    (title !== (saved?.title || "") || body !== (saved?.body || ""));
  useEffect(
    () => onStateChange({ dirty, busy: working }),
    [dirty, working, onStateChange],
  );
  async function submit(publicly: boolean) {
    if (working) return;
    setWorking(true);
    setError("");
    try {
      const note =
        saved && !dirty
          ? saved
          : await save({
              ...(saved ? { id: saved.id, updatedAt: saved.updatedAt } : {}),
              title,
              body,
            }).unwrap();
      setSaved(note);
      setTitle(note.title);
      setBody(note.body);
      if (publicly)
        await publish({
          id: note.id,
          updatedAt: note.updatedAt,
          projectId,
          status,
        }).unwrap();
      setFinished(publicly ? "public" : "private");
      toast.success(publicly ? "Note published" : "Private note saved");
      setConfirm(false);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
      setConfirm(false);
    } finally {
      setWorking(false);
    }
  }
  function another() {
    setTitle("");
    setBody("");
    setSaved(null);
    setFinished(null);
    setError("");
  }
  if (finished)
    return (
      <div className={styles.saved}>
        <h3>
          {finished === "public"
            ? "Your note is published."
            : "Saved for your eyes."}
        </h3>
        <p role="status">
          {finished === "public"
            ? "The public copy is on Updates. Your original is saved in Private notes."
            : "This note is saved privately. You can find it in your notes whenever you need it."}
        </p>
        <Link
          className="text-link"
          href={
            finished === "public" ? `/updates/${saved!.id}` : "/admin/notes"
          }
        >
          {finished === "public" ? "View published note" : "Open private notes"}{" "}
          →
        </Link>
        <div className={styles.actions}>
          <button className="button" onClick={onDone}>
            Done
          </button>
          <button className="button secondary" onClick={another}>
            <Plus size={14} /> Write another
          </button>
        </div>
      </div>
    );
  return (
    <>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void submit(false);
        }}
      >
        <label className="field">
          Note title
          <input
            required
            maxLength={120}
            value={title}
            disabled={working}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give the thought a name"
          />
        </label>
        <label className="field">
          Note text
          <textarea
            maxLength={16000}
            value={body}
            disabled={working}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Start anywhere…"
          />
        </label>
        <details>
          <summary>Project & progress (optional)</summary>
          <div className={styles.row}>
            <label className="field">
              Related project
              <select
                value={projectId}
                disabled={working}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="personal">Personal notes</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.shortName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Progress state
              <select
                value={status}
                disabled={working}
                onChange={(event) => setStatus(event.target.value)}
              >
                {["In progress", "In testing", "Released", "On hold"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
          </div>
        </details>
        {saved && (
          <p className={styles.success}>
            A private copy is already saved. You can retry publishing.
          </p>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton pending={working && !confirm}
            className="button secondary"
            disabled={working || !title.trim()}
          >
            <Lock size={14} />
            {working ? "Saving…" : "Save privately"}
          </ActionButton>
          <button
            className="button"
            type="button"
            disabled={working || !title.trim() || !body.trim()}
            onClick={() => setConfirm(true)}
          >
            <Globe size={14} /> Publish note
          </button>
        </div>
        <p>
          Private until you choose Publish. Published notes appear on Updates.
        </p>
      </form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Publish this note?"
        description="The title and text will be visible to everyone on Updates. A separate private copy is also saved in your notes."
        label="Publish note"
        busy={working}
        onConfirm={() => void submit(true)}
      />
    </>
  );
}
