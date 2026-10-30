"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Radio, Save } from "lucide-react";
import { updatesApi } from "@/features/updates/api/updates-api";
import type { UpdateRecord } from "@/features/updates/model/types";
import { projects } from "@/data/projects";
import { QueryState } from "@/components/ui/QueryState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/Workspace.module.css";

export function UpdatesWorkspace() {
  const [page, setPage] = useState(1);
  const query = updatesApi.useUpdatesQuery(page);
  const [save, { isLoading: saving }] = updatesApi.useSaveUpdateMutation();
  const [remove, { isLoading: removing }] =
    updatesApi.useDeleteUpdateMutation();
  const [selected, setSelected] = useState<UpdateRecord | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    projectId: "mh-tri",
    status: "In progress",
  });
  const [error, setError] = useState("");
  const [action, setAction] = useState<
    "publish" | "unpublish" | "delete" | null
  >(null);
  const [pending, setPending] = useState<UpdateRecord | "new" | null>(null);
  const original = {
    title: selected?.title || "",
    body: selected?.body || "",
    projectId: selected?.projectId || "mh-tri",
    status: selected?.status || "In progress",
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const busy = saving || removing;
  function select(record: UpdateRecord | null) {
    setSelected(record);
    setDraft({
      title: record?.title || "",
      body: record?.body || "",
      projectId: record?.projectId || "mh-tri",
      status: record?.status || "In progress",
    });
    setError("");
  }
  function choose(record: UpdateRecord | null) {
    if (dirty) setPending(record || "new");
    else select(record);
  }
  async function submit(publish: boolean) {
    setError("");
    try {
      const result = await save({
        ...draft,
        ...(selected ? { id: selected.id, updatedAt: selected.updatedAt } : {}),
        publish,
      }).unwrap();
      select(result);
      setAction(null);
      toast.success(publish ? "Update published" : "Draft saved");
    } catch (err) {
      setError(errorMessage(err));
      setAction(null);
    }
  }
  function formSubmit(event: FormEvent) {
    event.preventDefault();
    if (selected?.publishedAt) setAction("publish");
    else void submit(false);
  }
  async function confirm() {
    if (action === "delete" && selected) {
      try {
        await remove({
          id: selected.id,
          updatedAt: selected.updatedAt,
        }).unwrap();
        select(null);
        setAction(null);
        toast.success("Update deleted");
      } catch (err) {
        setError(errorMessage(err));
        setAction(null);
      }
    } else await submit(action === "publish");
  }
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">FROM THE WORKBENCH</p>
        <h1>Progress, when it’s ready.</h1>
        <p>
          Drafts stay private. Publishing makes the text visible on the public
          Updates page.
        </p>
      </div>
      <QueryState
        loading={query.isLoading}
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
            <Plus size={16} /> New update
          </button>
          <div className={styles.list}>
            {query.data?.items.map((update) => (
              <button
                key={update.id}
                className={styles.listItem}
                aria-pressed={selected?.id === update.id}
                onClick={() => choose(update)}
                disabled={busy}
              >
                <strong>{update.title}</strong>
                <small>
                  {update.publishedAt ? "Published" : "Private draft"} ·{" "}
                  {update.status}
                </small>
              </button>
            ))}
          </div>
          {query.data?.items.length === 0 && (
            <p className={styles.empty}>Your first update starts here.</p>
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
        <form className={styles.form} onSubmit={formSubmit}>
          <h2>
            {selected?.publishedAt
              ? "Published update"
              : selected
                ? "Private draft"
                : "Something to share."}
          </h2>
          <label className="field">
            Title
            <input
              required
              maxLength={140}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              disabled={busy}
            />
          </label>
          <div className={styles.formRow}>
            <label className="field">
              Project
              <select
                value={draft.projectId}
                onChange={(e) =>
                  setDraft({ ...draft, projectId: e.target.value })
                }
                disabled={busy}
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
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                disabled={busy}
              >
                {["In progress", "In testing", "Released", "On hold"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label className="field">
            Update text
            <textarea
              required
              maxLength={16000}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              disabled={busy}
            />
          </label>
          <p>Plain text only. Don’t include personal notes or credentials.</p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <button
              className="button secondary"
              disabled={
                busy || !dirty || !draft.title.trim() || !draft.body.trim()
              }
            >
              <Save size={15} />
              {selected?.publishedAt ? "Save published changes" : "Save draft"}
            </button>
            {!selected?.publishedAt && (
              <button
                type="button"
                className="button"
                disabled={busy || !draft.title.trim() || !draft.body.trim()}
                onClick={() => setAction("publish")}
              >
                <Radio size={15} /> Publish
              </button>
            )}
            {selected?.publishedAt && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setAction("unpublish")}
                disabled={busy}
              >
                Unpublish
              </button>
            )}
            {selected && (
              <button
                type="button"
                className={styles.delete}
                onClick={() => setAction("delete")}
                disabled={busy}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
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
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        busy={busy}
        title={
          action === "delete"
            ? "Delete this update?"
            : action === "unpublish"
              ? "Move this update to drafts?"
              : "Publish this update?"
        }
        description={
          action === "delete"
            ? "This permanently removes the update from the workspace and the public website."
            : action === "unpublish"
              ? "This removes the update from the public website and saves the current text as a private draft."
              : "The current title and text will be visible to everyone on the website."
        }
        label={
          action === "delete"
            ? "Delete update"
            : action === "unpublish"
              ? "Unpublish"
              : "Publish update"
        }
        onConfirm={confirm}
      />
    </>
  );
}
