"use client";
import { useSyncExternalStore } from "react";
import { animationStorageKey, legacyEntranceStorageKey, type MotionPreference } from "../model/animation-preference";

export type { MotionPreference } from "../model/animation-preference";
const eventName = "rowell-mode:site-motion-changed";
let memory: MotionPreference | undefined;
export function readMotionPreference(): MotionPreference {
  if (memory) return memory;
  try {
    const value = window.localStorage.getItem(animationStorageKey);
    if (value === "full" || value === "reduced") return value;
    return window.localStorage.getItem(legacyEntranceStorageKey) === "still" ? "reduced" : "full";
  } catch { return "full"; }
}
function subscribe(changed: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === animationStorageKey || event.key === legacyEntranceStorageKey) {
      memory = undefined;
      changed();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener(eventName, changed);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(eventName, changed);
  };
}
export function useMotionPreference() {
  const mode = useSyncExternalStore(subscribe, readMotionPreference, () => "full" as MotionPreference);
  function setPreference(value: MotionPreference) {
    memory = value;
    try { window.localStorage.setItem(animationStorageKey, value); } catch { /* This tab still supports the chosen display preference. */ }
    window.dispatchEvent(new Event(eventName));
  }
  return { preference: mode, reduced: mode === "reduced", setPreference };
}
