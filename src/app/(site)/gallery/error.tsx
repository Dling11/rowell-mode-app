"use client";
import { useTransition } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
export default function GalleryError({ reset }: { reset: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main id="main" className="container" style={{ paddingBlock: 80 }}>
      <h1>The gallery couldn’t load.</h1>
      <p>Please try again.</p>
      <ActionButton pending={pending} className="button secondary" onClick={() => startTransition(reset)}>
        {pending ? "Retrying…" : "Try again"}
      </ActionButton>
    </main>
  );
}
