"use client";
import { useEffect, useRef, type PointerEvent } from "react";
import { useAnimate } from "motion/react-mini";

export function useWelcomeSequence({ enabled, ready, run, preview }: { enabled: boolean; ready: boolean; run: number; preview: boolean }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const pointerAnimation = useRef<ReturnType<typeof animate> | null>(null);
  const lastPointer = useRef(0);
  useEffect(() => {
    if (!enabled || !ready || !scope.current) return;
    const controls: ReturnType<typeof animate>[] = [];
    const play = (...args: Parameters<typeof animate>) => { const control = animate(...args); controls.push(control); };
    const slow = [0.18, 0.5, 0.24, 1] as [number, number, number, number];
    play('[data-cinematic="art"]', { transform: ["scale(1.24) translateY(2%)", "scale(1.13) translateY(.8%)", "scale(1.04) translateY(0%)"], opacity: [0, 1, 1] }, { duration: 15, ease: slow, times: [0, .18, 1] });
    play('[data-cinematic="curtain-top"]', { transform: ["translateY(0%)", "translateY(-103%)"] }, { delay: .35, duration: 3.4, ease: [.6, 0, .2, 1] });
    play('[data-cinematic="curtain-bottom"]', { transform: ["translateY(0%)", "translateY(103%)"] }, { delay: .35, duration: 3.4, ease: [.6, 0, .2, 1] });
    play('[data-cinematic="kicker"]', { opacity: [0, 1], transform: ["translateY(20px)", "translateY(0px)"] }, { delay: 1.6, duration: 1.8 });
    for (const [word, delay, stagger, duration, height, scale] of [
      ["welcome", 2.1, .16, 2, 30, .86],
      ["boss", 4.1, .18, 2, 40, 1],
      ["name", 5.5, .28, 2.8, 65, 1.25],
    ] as const) {
      scope.current.querySelectorAll<HTMLElement>(`[data-cinematic="${word}"] span`).forEach((letter, index) => {
        play(letter, { opacity: [0, 1], transform: [`translateY(${height}px) scale(${scale})`, "translateY(0px) scale(1)"], filter: ["blur(6px)", "blur(0px)"] }, { delay: delay + index * stagger, duration, ease: [.16, .68, .2, 1] });
      });
    }
    play('[data-cinematic="subtitle"]', { opacity: [0, 1], transform: ["translateY(20px)", "translateY(0px)"] }, { delay: 8.8, duration: 1.8 });
    play('[data-cinematic="line"]', { opacity: [0, 1], transform: ["scaleX(0)", "scaleX(1)"] }, { delay: 8.3, duration: 2 });
    play('[data-cinematic="seal"]', { opacity: [0, .48, .18], transform: ["translate(-50%, -50%) scale(.75) rotate(-24deg)", "translate(-50%, -50%) scale(1.03) rotate(0deg)", "translate(-50%, -50%) scale(1.1) rotate(18deg)"] }, { duration: 12, delay: 2.5 });
    if (!preview) play('[data-cinematic="exit"]', { opacity: [0, 1] }, { delay: 13.9, duration: 1.1 });
    const stage = scope.current;
    return () => {
      controls.forEach((control) => control.cancel());
      pointerAnimation.current?.cancel();
      stage.querySelectorAll<HTMLElement>("[data-cinematic], [data-cinematic] span").forEach((element) => {
        for (const property of ["opacity", "transform", "filter"]) element.style.removeProperty(property);
      });
    };
  }, [animate, scope, enabled, ready, run, preview]);
  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled || !ready || event.pointerType !== "mouse" || performance.now() - lastPointer.current < 80) return;
    lastPointer.current = performance.now();
    const x = (event.clientX / window.innerWidth - .5) * -18;
    const y = (event.clientY / window.innerHeight - .5) * -12;
    pointerAnimation.current?.stop();
    pointerAnimation.current = animate('[data-cinematic="parallax"]', { transform: `translate3d(${x}px, ${y}px, 0)` }, { duration: 1, ease: "easeOut" });
  }
  function leave() {
    if (!enabled || !ready) return;
    pointerAnimation.current?.stop();
    pointerAnimation.current = animate('[data-cinematic="parallax"]', { transform: "translate3d(0px, 0px, 0px)" }, { duration: 1.2, ease: "easeOut" });
  }
  return { scope, move, leave };
}
