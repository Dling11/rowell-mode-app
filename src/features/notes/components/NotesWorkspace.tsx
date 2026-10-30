"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState, type FormEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notesApi } from "@/features/notes/api/notes-api";
import type { Note } from "@/features/notes/model/schema";
import { QueryState } from "@/components/ui/QueryState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import { NotePublication } from "./NotePublication";
import styles from "@/components/workspace/Workspace.module.css";

export function NotesWorkspace() {
  const [page, setPage] = useState(1);
  const query = notesApi.useNotesQuery(page);
  const [save, { isLoading: saving }] = notesApi.useSaveNoteMutation();
  const [remove, { isLoading: removing }] = notesApi.useDeleteNoteMutation();
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Note | "new" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const dirty =
    title !== (selected?.title || "") || body !== (selected?.body || "");
  const busy = saving || removing;
  function select(note: Note | null) {
    setSelected(note);
    setTitle(note?.title || "");
    setBody(note?.body || "");
    setError("");
  }
  function choose(note: Note | null) {
    if (dirty) setPending(note || "new");
    else select(note);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const note = await save({ ...selected, title, body }).unwrap();
      select(note);
      toast.success("Note saved");
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    }
  }
  async function deleteNote() {
    if (!selected) return;
    try {
      await remove({ id: selected.id, updatedAt: selected.updatedAt }).unwrap();
      select(null);
      setDeleteOpen(false);
      toast.success("Note deleted");
    } catch (err) {
      setError(errorMessage(err));
      setDeleteOpen(false);
    }
  }
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">FOR YOUR EYES</p>
        <h1>Private notes.</h1>
        <p>
          A place for ideas, rough edges, and things to come back to. Notes stay
          private. Choose “Publish a copy” on a saved note when you want to
          share it.
        </p>
      </div>
      <QueryState
        loading={query.isLoading} fetching={query.isFetching}
        error={query.error}
        retry={query.refetch}
      />
      <div className={styles.split}>
        <aside>
          <button
            className="button secondary"
            style={{ width: "100%", marginBottom: 15 }}
            onClick={() => choose(null)}
            disabled={busy}
          >
            <Plus size={16} /> New note
          </button>
          <div className={styles.list} role="group" aria-label="Saved notes">
            {query.data?.items.map((note) => (
              <button
                key={note.id}
                className={styles.listItem}
                aria-pressed={selected?.id === note.id}
                onClick={() => choose(note)}
                disabled={busy}
              >
                <strong>{note.title}</strong>
                <small>
                  {new Date(note.updatedAt).toLocaleDateString()} · Private
                </small>
              </button>
            ))}
          </div>
          {query.data?.items.length === 0 && (
            <p className={styles.empty}>No notes yet. Start with an idea.</p>
          )}
          <div className={styles.pagination}>
            <button
              className="button secondary"
              disabled={page === 1 || query.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="button secondary"
              disabled={!query.data?.nextPage || query.isFetching}
              onClick={() => setPage(query.data!.nextPage!)}
            >
              Next
            </button>
          </div>
        </aside>
        <form className={styles.form} onSubmit={submit}>
          <h2>{selected ? "Edit note" : "A new thought."}</h2>
          <label className="field">
            Title
            <input
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name"
              disabled={busy}
            />
          </label>
          <label className="field">
            Your note
            <textarea
              maxLength={24000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Start anywhere…"
              disabled={busy}
            />
          </label>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <ActionButton pending={saving}
              className="button"
              disabled={busy || !dirty || !title.trim()}
            >
              <Save size={15} />
              {saving ? "Saving…" : "Save note"}
            </ActionButton>
            <span>
              {dirty ? "Unsaved changes" : "Private · Saved changes only"}
            </span>
            {selected && (
              <button
                type="button"
                className={styles.delete}
                onClick={() => setDeleteOpen(true)}
                disabled={busy}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </form>
      </div>
      {selected && (
        <NotePublication
          key={selected.id}
          note={selected}
          disabled={dirty || busy}
        />
      )}
      <UnsavedChangesGuard dirty={dirty} />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Discard these edits?"
        description="Your latest changes haven’t been saved."
        label="Discard edits"
        onConfirm={() => {
          select(pending === "new" ? null : pending);
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this note?"
        description="This permanently removes the saved note. This can’t be undone."
        label="Delete note"
        busy={removing}
        onConfirm={deleteNote}
      />
    </>
  );
}
