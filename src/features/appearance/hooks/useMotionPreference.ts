"use client";
import { useSyncExternalStore } from "react";

export type MotionPreference = "system" | "full" | "reduced";
const key = "rowell-mode:site-motion";
const eventName = "rowell-mode:site-motion-changed";
let memory: MotionPreference | undefined;
function preference(): MotionPreference {
  if (memory) return memory;
  try {
    const value = window.localStorage.getItem(key);
    return value === "full" || value === "reduced" ? value : "system";
  } catch { return "system"; }
}
function snapshot() {
  return `${preference()}:${window.matchMedia("(prefers-reduced-motion: reduce)").matches}`;
}
function subscribe(changed: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storage = () => { memory = undefined; changed(); };
  window.addEventListener("storage", storage);
  window.addEventListener(eventName, changed);
  media.addEventListener("change", changed);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(eventName, changed);
    media.removeEventListener("change", changed);
  };
}
export function useMotionPreference() {
  const current = useSyncExternalStore(subscribe, snapshot, () => "system:true");
  const [mode, systemReduced] = current.split(":") as [MotionPreference, string];
  function setPreference(value: MotionPreference) {
    memory = value;
    try { window.localStorage.setItem(key, value); } catch { /* This tab still supports the chosen display preference. */ }
    window.dispatchEvent(new Event(eventName));
  }
  return { preference: mode, reduced: mode === "reduced" || (mode === "system" && systemReduced === "true"), setPreference };
}
