"use client";
import { Plus, Trash2 } from "lucide-react";
import type { ProjectResource } from "../model/types";
import { projectsApi } from "../api/projects-api";
import { QueryState } from "@/components/ui/QueryState";
import styles from "./ResourceEditor.module.css";
export function ResourceEditor({
  value,
  onChange,
  projectId,
}: {
  value: ProjectResource[];
  onChange: (resources: ProjectResource[]) => void;
  projectId: string;
}) {
  const history = projectsApi.useProjectHistoryQuery(projectId);
  function change(index: number, next: ProjectResource) {
    onChange(value.map((resource, i) => (i === index ? next : resource)));
  }
  return (
    <fieldset className={styles.editor}>
      <legend>Resources & history</legend>
      <p>
        Add the project website, game-file references or documentation. Links
        open as external references; they do not approve an app download.
      </p>
      <div className={styles.links}>
        {value.map((resource, index) => (
          <div className={styles.resource} key={index}>
            <label className="field">
              Link {index + 1} title
              <input
                required
                maxLength={80}
                value={resource.title}
                onChange={(event) =>
                  change(index, { ...resource, title: event.target.value })
                }
              />
            </label>
            <label className="field">
              Link {index + 1} type
              <select
                value={resource.kind}
                onChange={(event) =>
                  change(index, {
                    ...resource,
                    kind: event.target.value as ProjectResource["kind"],
                  })
                }
              >
                {["Website", "Game files", "Documentation", "Source"].map(
                  (kind) => (
                    <option key={kind}>{kind}</option>
                  ),
                )}
              </select>
            </label>
            <label className={`field ${styles.url}`}>
              Link {index + 1} URL
              <input
                type="url"
                required
                pattern="https://.*"
                maxLength={1500}
                value={resource.url}
                onChange={(event) =>
                  change(index, { ...resource, url: event.target.value })
                }
                placeholder="https://"
              />
            </label>
            <button
              className="button secondary"
              type="button"
              aria-label={`Remove link ${index + 1}`}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="button secondary"
        disabled={value.length >= 12}
        onClick={() =>
          onChange([...value, { title: "", url: "", kind: "Website" }])
        }
      >
        <Plus size={14} /> Add resource link
      </button>
      <details className={styles.history}>
        <summary>Saved link history</summary>
        <QueryState
          loading={history.isLoading} fetching={history.isFetching}
          error={history.error}
          retry={history.refetch}
        />
        {history.data?.length === 0 && <p>No saved link changes yet.</p>}
        {history.data?.map((entry, index) => (
          <div key={`${entry.recordedAt}:${index}`}>
            <time dateTime={entry.recordedAt}>
              {new Date(entry.recordedAt).toLocaleString()}
            </time>
            <ul>
              {entry.resources.map((resource, i) => (
                <li key={i}>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {resource.title}
                  </a>
                  <small>{resource.url}</small>
                </li>
              ))}
            </ul>
            {!entry.resources.length && <p>All reference links removed.</p>}
          </div>
        ))}
      </details>
    </fieldset>
  );
}
