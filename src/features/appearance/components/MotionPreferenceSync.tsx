"use client";
import { useEffect } from "react";
import { useMotionPreference } from "../hooks/useMotionPreference";

export function MotionPreferenceSync() {
  const { preference } = useMotionPreference();
  useEffect(() => { document.documentElement.dataset.motion = preference; }, [preference]);
  return null;
}
