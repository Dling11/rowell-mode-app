"use client";
import { useImageUpload } from "../hooks/useImageUpload";
import { UploadForm } from "./UploadForm";
import { UploadActivity } from "./UploadActivity";
import { MediaLibrary } from "./MediaLibrary";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import styles from "@/components/workspace/Workspace.module.css";

export function UploadsWorkspace() {
  const upload = useImageUpload();
  return (
    <>
      <div className={styles.heading}>
        <p className="eyebrow">A PLACE FOR THE VISUALS</p>
        <h1>Your media library.</h1>
        <p>
          Upload photos privately, then choose which ones appear in your public
          gallery or on project cards. Installers stay on GitHub Releases.
        </p>
      </div>
      <UploadForm upload={upload} />
      <UploadActivity />
      <MediaLibrary />
      <UnsavedChangesGuard dirty={upload.busy} />
    </>
  );
}
