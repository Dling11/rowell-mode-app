export const welcomeScenes = [
  {
    id: "watcher",
    name: "01 · Moonlit watcher",
    image: "/images/owner-welcome.webp",
  },
  {
    id: "red-moon",
    name: "02 · Red moon",
    image: "/images/owner-welcome-red-moon.webp",
  },
  {
    id: "smoke",
    name: "03 · Awakening",
    image: "/images/owner-welcome-smoke.webp",
  },
] as const;
export type WelcomeScene = (typeof welcomeScenes)[number]["id"];
export const defaultWelcomeScene: WelcomeScene = "red-moon";
export const welcomeDurationMs = 15000;
