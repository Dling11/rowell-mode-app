import { Spinner } from "./Spinner";
import styles from "./Activity.module.css";
import { NavigationFeedback } from "./NavigationFeedback";

export function LoadingState({ label = "Getting the next page ready…", compact = false }: { label?: string; compact?: boolean }) {
  if (compact) return <p className={styles.inline} role="status"><Spinner />{label}</p>;
  return (
    <section className={styles.loading} aria-busy="true">
      <NavigationFeedback pending label={label} />
      <div className={styles.heading} role="status"><Spinner /><p>{label}</p></div>
      <div className={styles.skeletons} aria-hidden="true"><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div>
    </section>
  );
}
