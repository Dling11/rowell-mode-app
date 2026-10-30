"use client";
import { useCallback, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StoreProvider } from "@/store/StoreProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import { QuickNoteForm } from "@/features/notes/components/QuickNoteForm";
import { QuickPhotoForm } from "@/features/uploads/components/QuickPhotoForm";
import type { ComposerState } from "@/lib/composer";
import styles from "./QuickComposer.module.css";

export function QuickComposerDialog({
  kind,
  onClose,
}: {
  kind: "photo" | "note";
  onClose: () => void;
}) {
  const router = useRouter();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<ComposerState>({
    dirty: false,
    busy: false,
  });
  const [discard, setDiscard] = useState(false);
  const saved = useCallback(() => router.refresh(), [router]);
  function requestClose() {
    if (state.busy) return;
    if (state.dirty) setDiscard(true);
    else onClose();
  }
  return (
    <StoreProvider>
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            className={styles.dialog}
            onOpenAutoFocus={() => {
              returnFocus.current = document.activeElement as HTMLElement;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              returnFocus.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (state.busy) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (state.busy) event.preventDefault();
            }}
          >
            <p className="eyebrow">RIGHT HERE, WHILE IT’S FRESH</p>
            <Dialog.Title className={styles.title}>
              {kind === "photo" ? "A new moment." : "A new thought."}
            </Dialog.Title>
            <Dialog.Description className={styles.description}>
              Save privately, or choose to publish. You stay on this page.
            </Dialog.Description>
            {kind === "photo" ? (
              <QuickPhotoForm
                onStateChange={setState}
                onSaved={saved}
                onDone={onClose}
              />
            ) : (
              <QuickNoteForm
                onStateChange={setState}
                onSaved={saved}
                onDone={onClose}
              />
            )}
            <button
              className={styles.close}
              aria-label="Close editor"
              onClick={requestClose}
              disabled={state.busy}
            >
              <X size={19} />
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="Discard these edits?"
        description="Your latest changes haven’t been saved. Anything already saved privately stays in your library."
        label="Discard edits"
        onConfirm={onClose}
      />
      <UnsavedChangesGuard dirty={state.dirty || state.busy} />
      <ToastProvider />
    </StoreProvider>
  );
}
