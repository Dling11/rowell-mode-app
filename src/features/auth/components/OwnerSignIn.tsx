"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Fingerprint, LogIn, LockKeyhole, Play } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { PinPad } from "./PinPad";
import { ActionButton } from "@/components/ui/ActionButton";
import { queueSignInNotice } from "../lib/owner-notice";
import { toast } from "sonner";
import {
  useWelcomeMotion,
  type WelcomeMotion,
} from "../hooks/useWelcomeMotion";
import {
  defaultWelcomeScene,
  welcomeScenes,
  type WelcomeScene,
} from "../model/welcome-scenes";
import styles from "./OwnerAccess.module.css";
const subscribe = () => () => {};
const sceneKey = "rowell-mode:welcome-scene-v2";
function savedScene(): WelcomeScene {
  try {
    const value = window.localStorage.getItem(sceneKey);
    return (
      welcomeScenes.find((item) => item.id === value)?.id || defaultWelcomeScene
    );
  } catch {
    return defaultWelcomeScene;
  }
}
const BossWelcome = dynamic(
  () => import("./BossWelcome").then((module) => module.BossWelcome),
  {
    ssr: false,
    loading: () => (
      <div className={styles.welcomeLoading} role="status">
        WELCOME BOSS ROWELL
      </div>
    ),
  },
);
export function OwnerSignIn({
  configured,
  destination = "/admin",
}: {
  configured: boolean;
  destination?: "/admin" | "/install" | "/gallery" | "/updates";
}) {
  const [busy, setBusy] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [pin, setPin] = useState("");
  const [welcome, setWelcome] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sceneChoice, setSceneChoice] = useState<WelcomeScene | null>(null);
  const { motion, setMotion } = useWelcomeMotion();
  const storedScene = useSyncExternalStore(
    subscribe,
    savedScene,
    () => defaultWelcomeScene,
  );
  const scene = sceneChoice || storedScene;
  const passkeys = useSyncExternalStore(
    subscribe,
    () => Boolean(window.isSecureContext && window.PublicKeyCredential),
    () => false,
  );
  const enterWorkspace = useCallback(() => {
    // A fresh request picks up the new authenticated session and avoids stale route data.
    queueSignInNotice();
    window.location.replace(destination);
  }, [destination]);
  const closePreview = useCallback(() => setPreview(false), []);
  const blocked = busy || welcome;
  function success() {
    setPin("");
    setWelcome(true);
  }
  function reportError(message: string) {
    setError(message);
    toast.error(message, { id: "owner-sign-in-error" });
  }
  async function signIn(username: string, password: string) {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.username({ username, password });
      if (result.error)
        reportError(
          "Sign-in failed. Check your credentials or try again shortly.",
        );
      else success();
    } catch {
      reportError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function signInPin() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/owner-pin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok)
        reportError(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : "PIN sign-in failed. Check your PIN or try again shortly.",
        );
      else success();
    } catch {
      reportError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function usePasskey() {
    setBusy(true);
    setPasskeyPending(true);
    setError("");
    try {
      const result = await authClient.signIn.passkey();
      if (result.error)
        reportError(
          "Passkey sign-in didn’t finish. Try again or use your password.",
        );
      else success();
    } catch {
      reportError("Passkey sign-in didn’t finish. You can use your password.");
    } finally {
      setBusy(false);
      setPasskeyPending(false);
    }
  }
  return (
    <>
      <div className={styles.methods} role="group" aria-label="Sign-in method">
        {(["password", "pin"] as const).map((method) => (
          <button
            type="button"
            key={method}
            aria-pressed={mode === method}
            disabled={blocked}
            onClick={() => {
              setMode(method);
              setPin("");
              setError("");
            }}
          >
            {method === "pin" ? "PIN" : "Password"}
          </button>
        ))}
      </div>
      <form
        className={styles.form}
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === "pin") void signInPin();
          else {
            const data = new FormData(event.currentTarget);
            void signIn(
              String(data.get("username")),
              String(data.get("password")),
            );
          }
        }}
      >
        {mode === "password" ? (
          <>
            <label className="field">
              Username
              <input
                name="username"
                autoComplete="username webauthn"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={30}
                disabled={!configured || blocked}
              />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                disabled={!configured || blocked}
              />
            </label>
          </>
        ) : (
          <PinPad
            value={pin}
            onChange={(value) => {
              setPin(value);
              setError("");
            }}
            disabled={!configured || blocked}
          />
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <ActionButton pending={busy && !passkeyPending}
          className="button"
          disabled={!configured || blocked || (mode === "pin" && !pin)}
        >
          {mode === "pin" ? <LockKeyhole size={17} /> : <LogIn size={17} />}{" "}
          {busy && !passkeyPending ? "Signing in…" : mode === "pin" ? "Unlock" : "Sign in"}
        </ActionButton>
        <ActionButton pending={passkeyPending}
          type="button"
          className="button secondary"
          onClick={usePasskey}
          disabled={!configured || blocked || !passkeys}
        >
          <Fingerprint size={19} /> {passkeyPending ? "Waiting for your device…" : "Use a passkey"}
        </ActionButton>
        <p className={styles.hint}>
          Add a passkey after signing in to use your fingerprint, device PIN or
          security key.
        </p>
      </form>
      <details className={styles.entrance}>
        <summary>Choose your entrance</summary>
        <div
          className={styles.scenes}
          role="radiogroup"
          aria-label="Welcome background"
        >
          {welcomeScenes.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="welcome-scene"
                checked={scene === item.id}
                onChange={() => {
                  setSceneChoice(item.id);
                  try {
                    window.localStorage.setItem(sceneKey, item.id);
                  } catch {}
                }}
              />
              <Image
                src={item.image}
                alt=""
                width={180}
                height={100}
                loading="lazy"
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
        <label className={`field ${styles.motionChoice}`}>
          Entrance animation
          <select
            value={motion}
            onChange={(event) => setMotion(event.target.value as WelcomeMotion)}
          >
            <option value="system">Use device setting</option>
            <option value="full">Full cinematic animation</option>
            <option value="still">Still view</option>
          </select>
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={() => setPreview(true)}
          disabled={blocked}
        >
          <Play size={14} /> Preview entrance
        </button>
      </details>
      {welcome && (
        <BossWelcome
          scene={scene}
          motion={motion}
          onMotionChange={setMotion}
          onComplete={enterWorkspace}
        />
      )}
      {preview && (
        <BossWelcome
          scene={scene}
          motion={motion}
          onMotionChange={setMotion}
          preview
          onComplete={closePreview}
        />
      )}
    </>
  );
}
