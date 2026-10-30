"use client";
import { useState, useSyncExternalStore } from "react";
export type WelcomeMotion = "system" | "full" | "still";
const key = "rowell-mode:welcome-motion";
const eventName = "rowell-mode:welcome-motion-changed";
function read(): WelcomeMotion {
  try {
    const value = window.localStorage.getItem(key);
    return value === "full" || value === "still" ? value : "system";
  } catch {
    return "system";
  }
}
function subscribe(changed: () => void) {
  window.addEventListener("storage", changed);
  window.addEventListener(eventName, changed);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener(eventName, changed);
  };
}
export function useWelcomeMotion() {
  const stored = useSyncExternalStore(
    subscribe,
    read,
    () => "system" as WelcomeMotion,
  );
  const [choice, setChoice] = useState<WelcomeMotion | null>(null);
  function setMotion(value: WelcomeMotion) {
    setChoice(value);
    try {
      window.localStorage.setItem(key, value);
      window.dispatchEvent(new Event(eventName));
    } catch {}
  }
  return { motion: choice || stored, setMotion };
}
