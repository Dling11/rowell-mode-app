"use client";
import { useState, useSyncExternalStore } from "react";

export function usePrivateSetupCode() {
  const [store] = useState(() => {
    let code = "";
    return {
      subscribe(changed: () => void) {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const incoming = fragment.get("setup");
        if (incoming) {
          code = incoming;
          window.history.replaceState(null, "", window.location.pathname);
          changed();
        }
        return () => {};
      },
      snapshot: () => code,
      clear: () => {
        code = "";
      },
    };
  });
  return [
    useSyncExternalStore(store.subscribe, store.snapshot, () => ""),
    store.clear,
  ] as const;
}
