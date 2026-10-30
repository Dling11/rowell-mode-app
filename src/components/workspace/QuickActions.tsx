"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/ui/AppLink";
import { ImagePlus, NotebookPen, Settings2 } from "lucide-react";
import styles from "./QuickComposer.module.css";
import { Spinner } from "@/components/ui/Spinner";
const OwnerToasts = dynamic(() => import("@/components/ui/ToastProvider").then((module) => module.ToastProvider), { ssr: false });

const QuickComposerDialog = dynamic(
  () =>
    import("./QuickComposerDialog").then(
      (module) => module.QuickComposerDialog,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className={styles.loading}>
        <Spinner /> Opening the editor…
      </p>
    ),
  },
);

export function QuickActions({ kind }: { kind: "photo" | "note" }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.toolbar} aria-label="Owner quick actions">
      <OwnerToasts />
      <div>
        <span className={styles.badge}>OWNER ACCESS</span>
        <p>
          {kind === "photo"
            ? "A new moment to share?"
            : "Something on your mind?"}
        </p>
      </div>
      <div className={styles.toolbarActions}>
        <Link
          href={kind === "photo" ? "/admin/uploads" : "/admin/notes"}
          className={styles.manage}
        >
          <Settings2 size={14} /> Manage
        </Link>
        <button className="button" onClick={() => setOpen(true)}>
          {kind === "photo" ? (
            <ImagePlus size={16} />
          ) : (
            <NotebookPen size={16} />
          )}{" "}
          {kind === "photo" ? "Add photo" : "Write a note"}
        </button>
      </div>
      {open && (
        <QuickComposerDialog kind={kind} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
