import type { ComponentProps } from "react";
import { Spinner } from "./Spinner";
import styles from "./Activity.module.css";

export function ActionButton({ pending = false, disabled, className = "", children, ...props }: ComponentProps<"button"> & { pending?: boolean }) {
  return (
    <button {...props} className={`${className}${pending ? ` ${styles.busy}` : ""}`} aria-busy={pending || undefined} disabled={disabled || pending}>
      {pending && <Spinner />}{children}
    </button>
  );
}
