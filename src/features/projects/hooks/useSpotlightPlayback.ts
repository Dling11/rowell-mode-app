"use client";
import { useState, useSyncExternalStore } from "react";

type Playback = "play" | "pause";
const preferenceKey = "rowell-mode:spotlight-playback";
const changedEvent = "rowell-mode:spotlight-playback-changed";

function readPreference(): Playback | null {
  try {
    const value = window.localStorage.getItem(preferenceKey);
    return value === "play" || value === "pause" ? value : null;
  } catch {
    return null;
  }
}
function subscribe(changed: () => void) {
  window.addEventListener("storage", changed);
  window.addEventListener(changedEvent, changed);
  return () => {
    window.removeEventListener("storage", changed);
    window.removeEventListener(changedEvent, changed);
  };
}
const serverPreference = () => null;

export function useSpotlightPlayback(reduced: boolean) {
  const saved = useSyncExternalStore(
    subscribe,
    readPreference,
    serverPreference,
  );
  // A local choice still works when the browser blocks preference storage.
  const [choice, setChoice] = useState<Playback | null>(null);
  const preference = choice ?? saved;
  const paused = preference ? preference === "pause" : reduced;
  function toggle() {
    const next = paused ? "play" : "pause";
    setChoice(next);
    try {
      window.localStorage.setItem(preferenceKey, next);
      window.dispatchEvent(new Event(changedEvent));
    } catch {
      /* Keep the current page usable without storage. */
    }
  }
  return { paused, toggle };
}
