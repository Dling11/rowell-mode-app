"use client";
import { useId } from "react";
import { useMotionPreference, type MotionPreference } from "../hooks/useMotionPreference";
import styles from "./MotionControl.module.css";

export function MotionControl() {
  const id = useId();
  const { preference, setPreference } = useMotionPreference();
  return <label htmlFor={id} className={styles.control}>Animations
    <select id={id} aria-label="Animations on this device" aria-describedby={`${id}-hint`} value={preference} onChange={(event) => setPreference(event.target.value as MotionPreference)}>
      <option value="full">On</option><option value="reduced">Off</option>
    </select>
    <span id={`${id}-hint`} className="sr-only">Saved in this browser on this device. Off uses a simpler view.</span>
  </label>;
}
