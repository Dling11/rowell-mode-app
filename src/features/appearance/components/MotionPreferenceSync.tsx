"use client";
import { useEffect } from "react";
import { readMotionPreference, useMotionPreference } from "../hooks/useMotionPreference";

export function MotionPreferenceSync() {
  const { preference } = useMotionPreference();
  useEffect(() => { document.documentElement.dataset.motion = readMotionPreference(); }, [preference]);
  return null;
}
