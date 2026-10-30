"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { projectsApi } from "@/features/projects/api/projects-api";
import type { Project } from "@/features/projects/model/types";
import { ReleaseEditor } from "@/features/downloads/components/ReleaseEditor";
import { QueryState } from "@/components/ui/QueryState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import { PublishedImagePicker } from "@/features/uploads/components/PublishedImagePicker";
import { ResourceEditor } from "./ResourceEditor";
import styles from "@/components/workspace/Workspace.module.css";

function ProjectEditor({
  project,
  onDirtyChange,
}: {
  project: Project;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const original = {
    summary: project.summary,
    description: project.description,
    status: project.status as string,
    resources: project.resources || [],
    coverMediaId: project.coverMediaId || null,
  };
  const [draft, setDraft] = useState(original);
  const [save, { isLoading }] = projectsApi.useSaveProjectMutation();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  function updateDraft(next: typeof draft) {
    setDraft(next);
    onDirtyChange(JSON.stringify(next) !== JSON.stringify(original));
  }
  async function submit() {
    setError("");
    try {
      await save({ projectId: project.id, ...draft }).unwrap();
      onDirtyChange(false);
      setConfirm(false);
      toast.success("Project updated");
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
      setConfirm(false);
    }
  }
  return (
    <>
      <form
        className={styles.form}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setConfirm(true);
        }}
      >
        <h2>{project.name}</h2>
        <PublishedImagePicker
          value={draft.coverMediaId}
          onChange={(coverMediaId) => updateDraft({ ...draft, coverMediaId })}
        />
        <label className="field">
          Card summary
          <input
            required
            maxLength={160}
            value={draft.summary}
            onChange={(e) => updateDraft({ ...draft, summary: e.target.value })}
          />
        </label>
        <label className="field">
          Project description
          <textarea
            required
            maxLength={1200}
            value={draft.description}
            onChange={(e) =>
              updateDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <label className="field">
          Progress state
          <select
            value={draft.status}
            onChange={(e) => updateDraft({ ...draft, status: e.target.value })}
          >
            {["Released", "In testing", "In progress", "On hold"].map(
              (status) => (
                <option key={status}>{status}</option>
              ),
            )}
          </select>
        </label>
        <p>
          These fields are public. Release approval is managed separately below.
        </p>
        <ResourceEditor
          value={draft.resources}
          onChange={(resources) => updateDraft({ ...draft, resources })}
          projectId={project.id}
        />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <ActionButton pending={isLoading} className="button" disabled={isLoading || !dirty}>
          Save public changes
        </ActionButton>
      </form>
      <UnsavedChangesGuard dirty={dirty} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Update the public project?"
        description="The project text, card image and resource links will change on the public website. Saved resource changes are kept in link history."
        label="Save public changes"
        busy={isLoading}
        onConfirm={submit}
      />
    </>
  );
}
export function ProjectsWorkspace() {
  const query = projectsApi.useProjectsQuery();
  const [selected, setSelected] = useState("mh-tri");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const project = query.data?.find((p) => p.id === selected);
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">THE COLLECTION</p>
        <h1>Projects & approved releases.</h1>
        <p>
          Edit public project copy and pin published assets. A source push never
          selects a new download.
        </p>
      </div>
      <QueryState
        loading={query.isLoading} fetching={query.isFetching}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <nav
            className={styles.actions}
            aria-label="Select project"
            style={{ marginBottom: 20 }}
          >
            {query.data.map((p) => (
              <button
                key={p.id}
                className="button secondary"
                aria-pressed={p.id === selected}
                onClick={() => {
                  if (hasUnsaved) setPending(p.id);
                  else setSelected(p.id);
                }}
              >
                {p.shortName}
              </button>
            ))}
          </nav>
          {project && (
            <ProjectEditor
              key={JSON.stringify(project)}
              project={project}
              onDirtyChange={setHasUnsaved}
            />
          )}
        </>
      )}
      <ReleaseEditor />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Discard project edits?"
        description="The current project has unsaved changes."
        label="Discard edits"
        onConfirm={() => {
          if (pending) setSelected(pending);
          setPending(null);
          setHasUnsaved(false);
        }}
      />
    </>
  );
}
