"use client";
import { useAppSelector } from "@/store/hooks";
import styles from "@/components/workspace/Workspace.module.css";

const statusLabels = {
  uploading: "Transferring",
  verifying: "Verifying",
  complete: "Verified",
  error: "Needs attention",
};
export function UploadActivity() {
  const uploads = useAppSelector((state) => state.uploads);
  if (!uploads.length) return null;
  return (
    <section className={styles.panel} aria-label="Recent upload status">
      <h2>Recent activity</h2>
      {uploads.map((upload) => (
        <div className={styles.row} key={upload.id}>
          <span style={{ overflowWrap: "anywhere" }}>{upload.name}</span>
          <span role="status">{statusLabels[upload.status]}</span>
        </div>
      ))}
    </section>
  );
}
