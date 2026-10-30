"use client";
import { ActionButton } from "@/components/ui/ActionButton";
import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => setStandalone(displayMode.matches);
    syncDisplayMode();
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage("");
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener("change", syncDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener("change", syncDisplayMode);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation requested. Follow your device’s confirmation."
          : "You can install later using Chrome’s menu.",
      );
    } catch {
      setMessage("Use Chrome’s menu to install, or try again later.");
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }
  if (standalone)
    return (
      <p className="notice" role="status">
        <Check size={18} /> You’re already using the app.
      </p>
    );
  if (installed)
    return (
      <p className="notice" role="status">
        <Check size={18} /> App installed. Open it from your home screen.
      </p>
    );
  return (
    <div>
      {prompt && (
        <ActionButton pending={busy} className="button" onClick={install} disabled={busy}>
          <Download size={16} />
          {busy ? "Opening install…" : "Install app"}
        </ActionButton>
      )}
      <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
        You can also open Chrome’s menu and choose{" "}
        <strong>Add to Home screen</strong> or <strong>Install app</strong>,
        when available.
      </p>
      {message && (
        <p className="notice" role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </div>
  );
}
