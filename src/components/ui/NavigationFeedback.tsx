"use client";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { Spinner } from "./Spinner";
import styles from "./Activity.module.css";

const subscribe = () => () => {};
type FeedbackProps = { pending: boolean; label?: string; busy?: boolean };
export function NavigationFeedback({ pending, ...props }: FeedbackProps) {
  if (!pending) return null;
  return <MountedFeedback {...props} />;
}

function MountedFeedback({ label = "Opening page…", busy = true }: Omit<FeedbackProps, "pending">) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div className={styles.navigation} data-navigation-pending="true">
      {busy && <div className={styles.track} aria-hidden="true"><span className={styles.beam} /></div>}
      <div className={styles.pill} role="status" aria-live="polite" aria-atomic="true">
        {busy ? <Spinner /> : <span aria-hidden="true">↓</span>}<span>{label}</span>
      </div>
    </div>,
    document.body,
  );
}
