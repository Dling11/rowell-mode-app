"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, ImagePlus, Lock, Plus } from "lucide-react";
import { useImageUpload } from "../hooks/useImageUpload";
import { uploadsApi } from "../api/uploads-api";
import type { MediaRecord } from "../model/schema";
import type { ComposerProps } from "@/lib/composer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { errorMessage } from "@/lib/errors";
import styles from "@/components/workspace/QuickComposer.module.css";

export function QuickPhotoForm({
  onStateChange,
  onSaved,
  onDone,
}: ComposerProps) {
  const upload = useImageUpload();
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState<{
    published: boolean;
    media: MediaRecord;
  } | null>(null);
  const [publish] = uploadsApi.usePublishMediaMutation();
  const dirty =
    !finished && Boolean(upload.file || upload.receipt || alt || caption);
  useEffect(
    () => onStateChange({ dirty, busy: working }),
    [dirty, working, onStateChange],
  );
  const ready = Boolean(
    upload.canUpload || upload.receipt || upload.completedMedia,
  );
  async function submit(publicly: boolean) {
    if (working) return;
    setWorking(true);
    setError("");
    try {
      const media =
        upload.completedMedia ||
        (upload.receipt
          ? await upload.retryVerification()
          : await upload.upload());
      if (!media) {
        setConfirm(false);
        return;
      }
      await publish({
        id: media.id,
        alt,
        caption,
        publish: publicly,
        updatedAt: media.updatedAt || media.createdAt,
      }).unwrap();
      setFinished({ published: publicly, media });
      setConfirm(false);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setConfirm(false);
    } finally {
      setWorking(false);
    }
  }
  function another() {
    upload.useAnotherImage();
    setAlt("");
    setCaption("");
    setError("");
    setFinished(null);
  }
  if (finished)
    return (
      <div className={styles.saved}>
        <div className={styles.photoPreview}>
          <Image
            src={`/api/admin/uploads/${finished.media.id}/preview`}
            alt={alt || "Saved photo preview"}
            fill
            unoptimized
            sizes="560px"
          />
        </div>
        <h3>
          {finished.published
            ? "A new moment in the gallery."
            : "Your photo is saved privately."}
        </h3>
        <p role="status">
          {finished.published
            ? "The photo and caption are now public. You can manage them in your media library."
            : "You’ll find the photo in your media library. It hasn’t been published."}
        </p>
        <Link className="text-link" href="/admin/uploads">
          Open media library →
        </Link>
        <div className={styles.actions}>
          <button className="button" onClick={onDone}>
            Done
          </button>
          <button className="button secondary" onClick={another}>
            <Plus size={14} /> Add another
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
        aria-busy={working}
      >
        <label className={styles.drop}>
          <span>
            <ImagePlus size={18} /> Photo file
          </span>
          <input
            key={upload.inputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required={!upload.completedMedia}
            disabled={working || Boolean(upload.receipt)}
            onChange={(event) => {
              upload.chooseFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
          <span className={styles.caption}>
            JPEG, PNG, WebP or AVIF · up to 5 MB
          </span>
        </label>
        <label className="field">
          Image description
          <input
            maxLength={200}
            value={alt}
            disabled={working}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Describe the photo (required to publish)"
          />
        </label>
        <label className="field">
          Caption
          <input
            maxLength={300}
            value={caption}
            disabled={working}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="A little context, if you like"
          />
        </label>
        {(error || upload.error) && (
          <p role="alert" className="error-text">
            {error || upload.error}
          </p>
        )}
        {upload.completedMedia && (
          <p className={styles.success}>
            The photo is saved privately. Retry to finish without transferring
            it again.
          </p>
        )}
        {working && (
          <p className={styles.working} role="status">
            {upload.phase === "signing"
              ? "Preparing the upload…"
              : upload.phase === "uploading"
                ? "Transferring your photo…"
                : upload.phase === "verifying"
                  ? "Verifying your photo…"
                  : "Saving your photo…"}
          </p>
        )}
        <div className={styles.actions}>
          <button className="button secondary" disabled={working || !ready}>
            <Lock size={14} /> Save privately
          </button>
          <button
            className="button"
            type="button"
            disabled={working || !ready || !alt.trim()}
            onClick={() => setConfirm(true)}
          >
            <Globe size={14} /> Publish photo
          </button>
          {upload.busy && upload.phase !== "verifying" && (
            <button
              className="button secondary"
              type="button"
              onClick={upload.cancelTransfer}
            >
              Cancel transfer
            </button>
          )}
          {upload.receipt && !working && (
            <button
              className="button secondary"
              type="button"
              onClick={upload.useAnotherImage}
            >
              Use another photo
            </button>
          )}
        </div>
        <p>Your photo stays private unless you choose Publish.</p>
      </form>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Publish this photo?"
        description="The image, description and caption will be visible to everyone in the gallery. The upload is verified before it can appear."
        label="Publish photo"
        busy={working}
        onConfirm={() => void submit(true)}
      />
    </>
  );
}
