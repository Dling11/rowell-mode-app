"use client";
import { useEffect, useState, type ComponentProps } from "react";
import { NavigationFeedback } from "@/components/ui/NavigationFeedback";

export function DownloadLink({ children, onClick, ...props }: ComponentProps<"a">) {
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!requested) return;
    // This dismisses a request acknowledgement; the browser owns download progress.
    const timer = window.setTimeout(() => setRequested(false), 5000);
    const reset = () => setRequested(false);
    window.addEventListener("pageshow", reset);
    return () => { window.clearTimeout(timer); window.removeEventListener("pageshow", reset); };
  }, [requested]);
  return <>
    <a {...props} onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!props.target || props.target === "_self")) setRequested(true);
    }}>{children}</a>
    <NavigationFeedback pending={requested} busy={false} label="Download requested · check your browser" />
  </>;
}
