"use client";
import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ArrowRight, Play, RotateCcw, ShieldCheck } from "lucide-react";
import {
  defaultWelcomeScene,
  welcomeDurationMs,
  welcomeScenes,
  type WelcomeScene,
} from "../model/welcome-scenes";
import type { WelcomeMotion } from "../hooks/useWelcomeMotion";
import styles from "./BossWelcome.module.css";
const subscribeMotion = (changed: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
};
function Letters({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((letter, index) => (
        <span
          className={styles.letter}
          key={index}
          style={{ "--i": index } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </>
  );
}
export function BossWelcome({
  scene = defaultWelcomeScene,
  preview = false,
  motion = "system",
  onMotionChange,
  onComplete,
}: {
  scene?: WelcomeScene;
  preview?: boolean;
  motion?: WelcomeMotion;
  onMotionChange?: (value: WelcomeMotion) => void;
  onComplete: () => void;
}) {
  const descriptionId = useId();
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const [override, setOverride] = useState<WelcomeMotion | null>(null);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState(0);
  const preference = override || motion;
  const animate =
    preference === "full" || (preference === "system" && !reduced);
  const selected =
    welcomeScenes.find((item) => item.id === scene) ||
    welcomeScenes.find((item) => item.id === defaultWelcomeScene)!;
  useEffect(() => {
    if (ready) return;
    const fallback = window.setTimeout(() => setReady(true), 10000);
    return () => window.clearTimeout(fallback);
  }, [ready, run]);
  useEffect(() => {
    if (preview || !ready || !animate) return;
    const timer = window.setTimeout(onComplete, welcomeDurationMs);
    return () => window.clearTimeout(timer);
  }, [onComplete, preview, ready, animate, run]);
  function changeMotion(value: WelcomeMotion) {
    setOverride(value);
    onMotionChange?.(value);
    setRun((value) => value + 1);
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onComplete();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.scene}
          data-scene={scene}
          data-reduced={reduced}
          data-motion={animate ? "full" : "still"}
          data-ready={ready}
          data-preview={preview}
          aria-describedby={descriptionId}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("welcome-continue")?.focus();
          }}
        >
          <div className={styles.stage} key={run}>
            <div className={styles.art}>
              <Image
                src={selected.image}
                alt=""
                fill
                unoptimized
                priority
                sizes="100vw"
                onLoad={() => setReady(true)}
                onError={() => setReady(true)}
              />
            </div>
            <div className={styles.darkness} />
            <div className={styles.aura} />
            <div className={styles.halo} />
            <div className={styles.fog} />
            <div className={styles.fogSecond} />
            <div className={styles.embers} aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <i key={index} style={{ "--n": index } as CSSProperties} />
              ))}
            </div>
            <div className={styles.curtainTop} />
            <div className={styles.curtainBottom} />
            <div className={styles.message}>
              <p className={styles.kicker}>
                <ShieldCheck size={14} />
                {preview ? "THE ENTRANCE" : "ACCESS GRANTED"}
              </p>
              <Dialog.Title
                className={styles.title}
                aria-label="WELCOME BOSS ROWELL"
              >
                <span className={styles.welcome} aria-hidden="true">
                  <Letters text="WELCOME" />
                </span>{" "}
                <span className={styles.boss} aria-hidden="true">
                  <Letters text="BOSS" />
                </span>{" "}
                <strong className={styles.name} aria-hidden="true">
                  <Letters text="ROWELL" />
                </strong>
              </Dialog.Title>
              <Dialog.Description
                id={descriptionId}
                className={styles.subtitle}
              >
                {preview
                  ? selected.name
                  : "Your world. Your rules. Your workbench."}
              </Dialog.Description>
              <div className={styles.line} />
            </div>
            <div className={styles.exitVeil} />
          </div>
          <div className={styles.top}>
            <span>ROWELL / MODE</span>
            <span>{preview ? "ENTRANCE PREVIEW" : "OWNER VERIFIED"}</span>
          </div>
          <div className={styles.controls}>
            <div className={styles.motionControls}>
              {animate ? (
                <>
                  <button onClick={() => changeMotion("still")}>
                    Still view
                  </button>
                  {preview && (
                    <button onClick={() => setRun((value) => value + 1)}>
                      <RotateCcw size={14} /> Replay
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span>Still view</span>
                  <button onClick={() => changeMotion("full")}>
                    <Play size={14} /> Play full animation
                  </button>
                </>
              )}
            </div>
            <button
              id="welcome-continue"
              className={styles.continue}
              onClick={onComplete}
            >
              {preview ? "Close preview" : "Enter workspace"}
              <ArrowRight size={16} />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
