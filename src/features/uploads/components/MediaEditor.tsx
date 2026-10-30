"use client";
import { useState } from "react";
import { PhotoPreview } from "@/components/media/PhotoPreview";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { uploadsApi } from "../api/uploads-api";
import type { MediaRecord } from "../model/schema";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { errorMessage } from "@/lib/errors";
import styles from "./MediaLibrary.module.css";

export function MediaEditor({ media }: { media: MediaRecord }) {
  const [alt, setAlt] = useState(media.alt || "");
  const [caption, setCaption] = useState(media.caption || "");
  const [action, setAction] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [save, { isLoading }] = uploadsApi.usePublishMediaMutation();
  const dirty = alt !== (media.alt || "") || caption !== (media.caption || "");
  async function submit() {
    try {
      await save({
        id: media.id,
        alt,
        caption,
        publish: Boolean(action),
        updatedAt: media.updatedAt || media.createdAt,
      }).unwrap();
      setAction(null);
      toast.success(action ? "Photo published" : "Photo is private");
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
      setAction(null);
    }
  }
  return (
    <article className={styles.card}>
        <PhotoPreview className={styles.preview} fit="contain"
          src={`/api/admin/uploads/${media.id}/preview`}
          alt="Uploaded image preview"
          caption={media.caption || media.name}
        />
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.status}>
            {media.publishedAt ? (
              <>
                <Globe size={12} /> Published
              </>
            ) : (
              <>
                <Lock size={12} /> Private
              </>
            )}
          </span>
          <span>
            {(media.bytes / 1024 / 1024).toFixed(2)} MB ·{" "}
            {media.format.toUpperCase()}
          </span>
        </div>
        <h3>{media.name}</h3>
        <label className="field">
          Image description
          <input
            maxLength={200}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Describe what is in the photo"
            disabled={isLoading}
          />
        </label>
        <label className="field">
          Public caption
          <input
            maxLength={300}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="A little context (optional)"
            disabled={isLoading}
          />
        </label>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button
            className="button"
            disabled={
              isLoading || !alt.trim() || Boolean(media.publishedAt && !dirty)
            }
            onClick={() => setAction(true)}
          >
            <Globe size={13} />
            {media.publishedAt ? "Save public photo" : "Publish photo"}
          </button>
          {media.publishedAt && (
            <button
              className="button secondary"
              disabled={isLoading}
              onClick={() => setAction(false)}
            >
              <Lock size={13} /> Make private
            </button>
          )}
        </div>
      </div>
      <UnsavedChangesGuard dirty={dirty} />
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={action ? "Publish this photo?" : "Make this photo private?"}
        description={
          action
            ? "This image, description and caption will appear in the public gallery. You can also select it for a project card."
            : "This removes the photo from the gallery and any project cards using it. People may already have saved a copy."
        }
        label={action ? "Publish photo" : "Make private"}
        busy={isLoading}
        onConfirm={submit}
      />
    </article>
  );
}
