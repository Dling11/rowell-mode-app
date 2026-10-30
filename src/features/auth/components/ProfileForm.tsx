"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "../lib/auth-client";
import { UnsavedChangesGuard } from "@/components/ui/UnsavedChangesGuard";
import styles from "@/components/workspace/Workspace.module.css";

export type OwnerProfile = { name: string; username: string };

export function ProfileForm({ profile }: { profile: OwnerProfile }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [name, setName] = useState(profile.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = name.trim() !== profile.name;
  return (
    <>
      <form
        className={styles.form}
        style={{ marginBottom: 25 }}
        aria-busy={busy || refreshing}
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await authClient.updateUser({ name: name.trim() });
            if (result.error)
              setError("Your profile couldn’t be saved. Please try again.");
            else {
              toast.success("Profile saved");
              startRefresh(() => router.refresh());
            }
          } catch {
            setError("Your profile couldn’t be saved. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>
          <UserRound size={21} /> Your profile
        </h2>
        <label className="field">
          Display name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            disabled={busy}
          />
        </label>
        <label className="field">
          Username
          <input value={profile.username} readOnly autoComplete="username" />
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <ActionButton pending={busy || refreshing} className="button" disabled={busy || !dirty || !name.trim()}>
          {busy || refreshing ? "Saving…" : "Save profile"}
        </ActionButton>
      </form>
      <UnsavedChangesGuard dirty={dirty} />
    </>
  );
}
