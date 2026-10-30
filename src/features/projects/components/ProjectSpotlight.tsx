"use client";
import {
  Children,
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import { useSpotlightPlayback } from "../hooks/useSpotlightPlayback";
import styles from "./Spotlight.module.css";
import { useMotionPreference } from "@/features/appearance/hooks/useMotionPreference";

const watchVisibility = (changed: () => void) => {
  document.addEventListener("visibilitychange", changed);
  return () => document.removeEventListener("visibilitychange", changed);
};

export function ProjectSpotlight({
  children,
  names,
}: {
  children: ReactNode;
  names: string[];
}) {
  const slides = Children.toArray(children);
  const id = useId();
  const [active, setActive] = useState(0);
  const [readingSlide, setReadingSlide] = useState(false);
  const { reduced } = useMotionPreference();
  const hidden = useSyncExternalStore(
    watchVisibility,
    () => document.hidden,
    () => false,
  );
  const { paused, toggle } = useSpotlightPlayback(reduced);
  const playing = !paused && !readingSlide && !hidden && slides.length > 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      4800,
    );
    return () => window.clearInterval(timer);
  }, [playing, slides.length, active]);
  function select(index: number) {
    setActive((index + slides.length) % slides.length);
  }
  return (
    <section
      className={styles.card}
      role="region"
      aria-roledescription="carousel"
      aria-label="Project spotlight"
      data-playing={playing}
      data-reduced={reduced}
    >
      <div className={styles.top}>
        <span>
          <Sparkles size={12} /> IN THE SPOTLIGHT
        </span>
        <span className={styles.position}>
          <span className={styles.playback}>{playing ? "AUTO" : "PAUSED"}</span>
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(slides.length).padStart(2, "0")}
        </span>
      </div>
      <div
        id={id}
        className={styles.viewport}
        onFocusCapture={() => setReadingSlide(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setReadingSlide(false);
        }}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className={styles.slide}
            data-active={active === index}
            aria-hidden={active !== index}
            inert={active !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${names[index]}`}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className={styles.progress} aria-hidden="true">
        <span key={`${active}:${playing}`} />
      </div>
      <div className={styles.controls}>
        <div className={styles.dots} aria-label="Choose a spotlight project">
          {names.map((name, index) => (
            <button
              key={name}
              type="button"
              aria-label={`Show ${name}`}
              aria-current={active === index ? "true" : undefined}
              aria-controls={id}
              onClick={() => select(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className={styles.arrows}>
          <button
            type="button"
            aria-label="Previous spotlight project"
            aria-controls={id}
            onClick={() => select(active - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            aria-label={paused ? "Play spotlight" : "Pause spotlight"}
            aria-describedby={reduced ? `${id}-motion` : undefined}
            title={
              paused
                ? reduced
                  ? "Play carousel without animation"
                  : "Play carousel"
                : "Pause carousel"
            }
            onClick={toggle}
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            type="button"
            aria-label="Next spotlight project"
            aria-controls={id}
            onClick={() => select(active + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      {reduced && (
        <span id={`${id}-motion`} className="sr-only">
          Reduced motion is enabled. Play cycles through the projects without
          animation.
        </span>
      )}
      <span
        className="sr-only"
        role="status"
        aria-live={paused ? "polite" : "off"}
      >
        {names[active]}, project {active + 1} of {slides.length}
      </span>
    </section>
  );
}
