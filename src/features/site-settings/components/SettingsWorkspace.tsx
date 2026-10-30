"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  settingsApi,
  type SettingsData,
} from "@/features/site-settings/api/settings-api";
import type { SiteSettings } from "@/features/site-settings/model/policy";
import { projects } from "@/data/projects";
import { QueryState } from "@/components/ui/QueryState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/Workspace.module.css";

function SettingsForm({ data }: { data: SettingsData }) {
  const [draft, setDraft] = useState<SiteSettings>(data.settings);
  const [save, { isLoading }] = settingsApi.useSaveSettingsMutation();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.settings);
  async function submit() {
    setError("");
    try {
      await save({ settings: draft, updatedAt: data.updatedAt }).unwrap();
      setConfirm(false);
      toast.success("Site controls saved");
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
        <h2>Public site mode</h2>
        {data.emergencyMode && (
          <p className="notice">
            Server override is active: {data.emergencyMode}. Effective mode:{" "}
            {data.effectiveMode}. The dashboard cannot loosen a server override.
          </p>
        )}
        {[
          [
            "normal",
            "Open for exploring",
            "Portfolio and approved downloads are available.",
          ],
          [
            "downloads-paused",
            "Keep reading, pause downloads",
            "The portfolio stays open. Download routes return temporary unavailability.",
          ],
          [
            "maintenance",
            "Take a little maintenance break",
            "Public pages show a maintenance message. Owner access stays available.",
          ],
        ].map(([mode, label, description]) => (
          <label className={styles.radio} key={mode}>
            <input
              type="radio"
              name="mode"
              value={mode}
              checked={draft.mode === mode}
              onChange={() =>
                setDraft({ ...draft, mode: mode as SiteSettings["mode"] })
              }
            />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
        <label className="field">
          Download-pause message
          <input
            maxLength={180}
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          />
        </label>
        <fieldset
          style={{
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "10px 18px",
          }}
        >
          <legend className={styles.hint}>Pause individual projects</legend>
          {projects.map((project) => (
            <label key={project.id} className={styles.checkbox}>
              <input
                type="checkbox"
                checked={draft.pausedProjects.includes(project.id as "mh-tri")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    pausedProjects: event.target.checked
                      ? [...draft.pausedProjects, project.id as "mh-tri"]
                      : draft.pausedProjects.filter((id) => id !== project.id),
                  })
                }
              />
              {project.name}
            </label>
          ))}
        </fieldset>
        <p>
          These controls govern requests through this website. Existing public
          GitHub links, downloaded copies and installed apps remain available.
        </p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <ActionButton pending={isLoading} className="button" disabled={!dirty || isLoading}>
          Save site controls
        </ActionButton>
      </form>
      <UnsavedChangesGuard dirty={dirty} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Apply these site controls?"
        description={`Public site mode will be ${draft.mode}. Download routes check these rules on every request.`}
        label="Apply controls"
        busy={isLoading}
        onConfirm={submit}
      />
    </>
  );
}
export function SettingsWorkspace() {
  const query = settingsApi.useSettingsQuery();
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">THE BIG SWITCHES</p>
        <h1>Your site, your call.</h1>
        <p>
          Pause downloads separately, hold a project, or put the public website
          into maintenance.
        </p>
      </div>
      <QueryState
        loading={query.isLoading} fetching={query.isFetching}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <SettingsForm key={query.data.updatedAt} data={query.data} />
      )}
    </>
  );
}
