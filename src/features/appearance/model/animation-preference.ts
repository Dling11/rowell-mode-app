export type MotionPreference = "full" | "reduced";
export const animationStorageKey = "rowell-mode:site-motion";
export const legacyEntranceStorageKey = "rowell-mode:welcome-motion";

// Apply the saved display choice before paint, including a previous explicit still view.
export const initialAnimationPreference = `try{var a=localStorage.getItem("${animationStorageKey}");document.documentElement.dataset.motion=a==="full"||a==="reduced"?a:localStorage.getItem("${legacyEntranceStorageKey}")==="still"?"reduced":"full"}catch{}`;
