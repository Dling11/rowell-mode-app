import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/features/install/components/ServiceWorkerRegistration";
import { site } from "@/data/site";
import "@/styles/globals.css";
import { MotionPreferenceSync } from "@/features/appearance/components/MotionPreferenceSync";
import { initialAnimationPreference } from "@/features/appearance/model/animation-preference";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Projects & little experiments`, template: `%s · ${site.name}` },
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.png", sizes: "64x64", type: "image/png" }], shortcut: "/icon.png", apple: "/icons/apple-touch-icon.png" },
  openGraph: { type: "website", siteName: site.name, title: site.name, description: site.description, url: site.url },
  twitter: { card: "summary_large_image", title: site.name, description: site.description },
  description: "Apps, community projects and things made along the way. Explore Rowell’s work, find public releases and follow what’s next.",
};
export const viewport: Viewport = { themeColor: "#0b1220", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-motion="full" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: initialAnimationPreference }}/></head><body><a className="skip-link" href="#main">Skip to content</a><MotionPreferenceSync/>{children}<ServiceWorkerRegistration/></body></html>;
}
