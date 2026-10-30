"use client";
import { useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { notesApi } from "../api/notes-api";
import type { Note } from "../model/schema";
import { projects } from "@/data/projects";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/Workspace.module.css";
export function NotePublication({
  note,
  disabled,
}: {
  note: Note;
  disabled: boolean;
}) {
  const [projectId, setProjectId] = useState("mh-tri");
  const [status, setStatus] = useState("In progress");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [copyId, setCopyId] = useState("");
  const [publish, { isLoading }] = notesApi.usePublishNoteMutation();
  async function submit() {
    try {
      const result = await publish({
        id: note.id,
        updatedAt: note.updatedAt,
        projectId,
        status,
      }).unwrap();
      setCopyId(result.id);
      setConfirm(false);
      toast.success(
        result.alreadyExists
          ? "A copy already exists. Manage it in Published progress."
          : "Note copy published",
      );
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(false);
    }
  }
  return (
    <section className={styles.panel} aria-labelledby="share-note-title">
      <h2 id="share-note-title">Something worth sharing?</h2>
      <p>
        Publish a separate copy to Updates. Later edits to this private note
        stay here. Manage or unpublish the public copy in{" "}
        <Link href="/admin/updates" className="text-link">
          Published progress
        </Link>
        .
      </p>
      <div className={styles.formRow} style={{ marginBlock: 18 }}>
        <label className="field">
          Share with project
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={isLoading}
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
          Public progress state
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={isLoading}
          >
            {["In progress", "In testing", "Released", "On hold"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {copyId ? (
        <Link href={`/updates/${copyId}`} className="text-link">
          View published copy →
        </Link>
      ) : (
        <button
          type="button"
          className="button secondary"
          disabled={disabled || isLoading || !note.body.trim()}
          onClick={() => setConfirm(true)}
        >
          <Globe size={14} /> Publish a copy
        </button>
      )}
      {disabled && (
        <p style={{ marginTop: 12 }}>Save your changes before publishing.</p>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Publish a copy of this note?"
        description={`Everyone will be able to read “${note.title}” and its saved text on Updates. Review the note for private information before publishing.`}
        label="Publish note copy"
        busy={isLoading}
        onConfirm={submit}
      />
    </section>
  );
}
