import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/features/install/components/ServiceWorkerRegistration";
import { site } from "@/data/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: `${site.name} — Projects & little experiments`, template: `%s · ${site.name}` },
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  description: "Apps, community projects and things made along the way. Explore Rowell’s work, find public releases and follow what’s next.",
};
export const viewport: Viewport = { themeColor: "#0b1220", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a>{children}<ServiceWorkerRegistration/></body></html>;
}
