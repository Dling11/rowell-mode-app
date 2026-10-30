"use client";
import { useId } from "react";
import { useMotionPreference, type MotionPreference } from "../hooks/useMotionPreference";
import styles from "./MotionControl.module.css";

export function MotionControl() {
  const id = useId();
  const { preference, setPreference } = useMotionPreference();
  return <label htmlFor={id} className={styles.control}>Motion
    <select id={id} aria-label="Site animation" value={preference} onChange={(event) => setPreference(event.target.value as MotionPreference)}>
      <option value="system">Device setting</option><option value="full">On</option><option value="reduced">Reduced</option>
    </select>
  </label>;
}
