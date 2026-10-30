"use client";
import { PhotoPreview } from "@/components/media/PhotoPreview";
import type { ImageUploadController } from "../hooks/useImageUpload";
import styles from "@/components/media/PhotoPreview.module.css";
import Image from "next/image";

export function SelectedPhotoPreview({ upload, interactive = true }: { upload: ImageUploadController; interactive?: boolean }) {
  if (!upload.previewUrl) return null;
  const name = upload.file?.name || upload.completedMedia?.name || "Selected photo";
  return <figure className={styles.selection}>{interactive ? <PhotoPreview src={upload.previewUrl} alt="Selected image preview" caption={name} fit="contain" /> : <Image className={styles.selectedImage} src={upload.previewUrl} alt="Selected image preview" width={1200} height={800} unoptimized />}<figcaption>{name} · {upload.completedMedia ? "Saved privately" : "Preview before upload"}</figcaption></figure>;
}
