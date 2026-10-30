"use client";
import { Upload } from "lucide-react";
import type { ImageUploadController } from "../hooks/useImageUpload";
import styles from "@/components/workspace/Workspace.module.css";

const phaseLabels = {
  idle: "Upload privately",
  signing: "Preparing upload…",
  uploading: "Transferring image…",
  verifying: "Verifying image…",
};
export function UploadForm({ upload }: { upload: ImageUploadController }) {
  return (
    <form
      className={styles.form}
      aria-busy={upload.busy}
      onSubmit={(event) => {
        event.preventDefault();
        void upload.upload();
      }}
    >
      <h2>Upload an image</h2>
      <label className="field">
        Image file
        <input
          key={upload.inputKey}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={upload.busy || Boolean(upload.receipt)}
          onChange={(event) =>
            upload.chooseFile(event.target.files?.[0] || null)
          }
        />
      </label>
      <p>
        JPEG, PNG, WebP or AVIF · up to 5 MB. Provider storage and usage quotas
        also apply.
      </p>
      {upload.error && (
        <p className="error-text" role="alert">
          {upload.error}
        </p>
      )}
      <div className={styles.actions}>
        {upload.receipt ? (
          <>
            <button
              type="button"
              className="button"
              disabled={upload.busy}
              onClick={upload.retryVerification}
            >
              {upload.busy ? phaseLabels[upload.phase] : "Retry verification"}
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={upload.busy}
              onClick={upload.useAnotherImage}
            >
              Use another image
            </button>
          </>
        ) : (
          <button className="button" disabled={!upload.canUpload}>
            <Upload size={15} />
            {phaseLabels[upload.phase]}
          </button>
        )}
        {upload.busy && upload.phase !== "verifying" && (
          <button
            type="button"
            className="button secondary"
            onClick={upload.cancelTransfer}
          >
            Cancel transfer
          </button>
        )}
      </div>
      {upload.receipt && !upload.busy && (
        <p>
          The image is private in Cloudinary. Retry verification to add it to
          this library without transferring it again.
        </p>
      )}
    </form>
  );
}
