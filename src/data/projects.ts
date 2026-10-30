import type { Project } from "@/features/projects/model/types";

export const creator = {
  name: "Rowell",
  channel: "Nikushimi",
  github: "https://github.com/Dling11",
  youtube: "https://www.youtube.com/@Nikushimi-19/videos",
  codingYoutube: "https://www.youtube.com/@Coding-is-life/videos",
  support: "https://support-page-donation.vercel.app/",
};

export const projects: Project[] = [
  {
    id: "mh-tri",
    name: "MH Tri — Rowell",
    shortName: "MH Tri",
    category: "Community project",
    summary: "A familiar hunt. A more personal way to play.",
    description: "A customized OceanTriRecomp build for Android and Windows, with English app settings, editable touch controls, combo buttons and save tools.",
    status: "Released",
    platforms: ["android", "windows"],
    version: "1.4.13",
    releaseLabel: "Public prerelease",
    repository: "https://github.com/Dling11/monster_hunter_tri_emulator",
    release: "https://github.com/Dling11/monster_hunter_tri_emulator/releases/tag/rowell-1.4.13",
    credits: "https://github.com/Dling11/monster_hunter_tri_emulator/blob/main/CREDITS.md",
    attribution: "Built on OceanTriRecomp and its contributors, with Aurora rendering services. Existing GPL, component AGPL and third-party notices apply. Monster Hunter Tri belongs to CAPCOM. Game files are not included.",
    highlights: ["English app settings", "Editable touch controls", "Combo buttons & save tools"],
    setup: ["Choose the Android APK or Windows portable ZIP for your device.", "Install the APK on Android, or extract the portable ZIP on Windows.", "Provide your own compatible game files. Game language is separate from the app settings."],
    releaseDate: "2026-10-28T16:35:04Z",
    resources: [
      { title: "Original Tri website", url: "https://monster-hunter-tri-android-apk.vercel.app/", kind: "Website" },
      { title: "Tri game-file reference", url: "https://romsfun.com/download/monster-hunter-3-tri-id1-13483/2", kind: "Game files" },
    ],
    resourceUpdatedAt: "2026-10-30T00:00:00.000Z",
  },
  {
    id: "share-mode",
    name: "Share Mode",
    shortName: "Share Mode",
    category: "Everyday utility",
    summary: "Your files. A short trip between devices.",
    description: "Local file transfers over the same Wi-Fi or an offline hotspot, with QR pairing, encrypted connections and transfer approval. Share Mode brings clearer Send, Receive and Recent screens to Android, alongside its portable Windows companion.",
    status: "Released",
    platforms: ["android", "windows"],
    version: "1.0.4",
    releaseLabel: "Public preview",
    repository: "https://github.com/Dling11/share-me-rowell",
    release: "https://github.com/Dling11/share-me-rowell/releases/tag/v1.0.4",
    credits: null,
    attribution: "Original application code is MIT licensed. Third-party notices are retained in the source and release packages.",
    highlights: ["Same Wi-Fi or offline hotspot", "QR pairing & transfer approval", "Android & Windows"],
    setup: ["Install the Android APK as an update, or extract the Windows ZIP and open Share-Mode.exe.", "Connect the devices to the same Wi-Fi network or offline hotspot.", "Choose Send or Receive, scan the other device’s QR code and approve the transfer. Optional Bluetooth transfer uses Android system sharing."],
    releaseDate: "2026-10-30T12:08:20Z",
  },
  {
    id: "mh4u",
    name: "Monster Hunter 4 — Rowell",
    shortName: "MH4U",
    category: "Community project",
    summary: "Another adventure, still on the workbench.",
    description: "An AzaharPlus-based Android customization with landscape layouts, a touch-control editor and combo buttons. Source code is available; there is no public app package yet.",
    status: "In testing",
    platforms: ["android"],
    version: null,
    releaseLabel: "Source only · No public APK",
    repository: "https://github.com/Dling11/MH4-ULTIMATE",
    release: null,
    credits: "https://github.com/Dling11/MH4-ULTIMATE/blob/main/CREDITS.md",
    attribution: "Built on AzaharPlus and the MH4U community projects. Optional game-code recompilation still uses Azahar services. GPL-3.0-or-later and dependency notices apply. Monster Hunter and its logo belong to CAPCOM.",
    highlights: ["Landscape interface", "Touch-control editing", "Combo buttons"],
    setup: ["Browse the public repository for source code and build information.", "No Android APK or Windows package is publicly available.", "Device testing is ongoing. A source update does not indicate a released app."],
    releaseDate: null,
  },
];

export function findProject(id: string) {
  return projects.find((project) => project.id === id);
}
