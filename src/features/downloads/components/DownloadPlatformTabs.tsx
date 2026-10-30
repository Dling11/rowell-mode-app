import Link from "@/components/ui/AppLink";
import { Layers3, Monitor, Smartphone } from "lucide-react";
import styles from "./DownloadsDirectory.module.css";

export function DownloadPlatformTabs({
  platform,
  query,
}: {
  platform: string;
  query: string;
}) {
  const tabs = [
    { value: "all", label: "All", icon: Layers3 },
    { value: "android", label: "Android", icon: Smartphone },
    { value: "windows", label: "PC", icon: Monitor },
  ];
  return (
    <nav aria-label="Download platforms" className={styles.tabs}>
      {tabs.map((tab) => {
        const params = new URLSearchParams({ platform: tab.value });
        if (query) params.set("q", query);
        return (
          <Link
            key={tab.value}
            href={`/downloads?${params}`}
            aria-current={platform === tab.value ? "page" : undefined}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
