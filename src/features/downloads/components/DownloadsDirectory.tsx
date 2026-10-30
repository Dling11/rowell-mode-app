import Link from "@/components/ui/AppLink";
import { PauseCircle, Search } from "lucide-react";
import type { Project } from "@/features/projects/model/types";
import type { SitePolicy } from "@/features/site-settings/model/policy";
import { DownloadPackageRow } from "./DownloadPackageRow";
import { DownloadPlatformTabs } from "./DownloadPlatformTabs";
import styles from "./DownloadsDirectory.module.css";
import { SearchForm } from "@/components/ui/SearchForm";

export function DownloadsDirectory({
  projects,
  policy,
  platform,
  query,
}: {
  projects: Project[];
  policy: SitePolicy;
  platform: string;
  query: string;
}) {
  const entries = projects
    .filter((project) =>
      (project.name + " " + project.summary)
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .flatMap((project) =>
      project.platforms
        .filter((value) => platform === "all" || value === platform)
        .map((value) => ({ project, platform: value })),
    );
  const published = entries.filter((entry) => entry.project.release).length;
  const testing = entries.length - published;
  return (
    <>
      <div className={styles.toolbar}>
        <p className={styles.directoryHint}>
          Choose a platform to find your next download.
        </p>
        <SearchForm action="/downloads" className={styles.search} submitLabel="Search downloads">
          <Search size={16} />
          <label className="sr-only" htmlFor="download-search">
            Search downloads
          </label>
          <input
            id="download-search"
            name="q"
            type="search"
            placeholder="Find an app…"
            defaultValue={query}
            maxLength={100}
          />
          <input type="hidden" name="platform" value={platform} />
        </SearchForm>
      </div>
      {!policy.available || policy.mode !== "normal" ? (
        <div className={styles.notice} role="status">
          <PauseCircle size={18} />
          <p>
            <strong>
              {policy.available
                ? "Downloads are currently paused."
                : "Downloads are temporarily unavailable."}
            </strong>{" "}
            You can still browse the directory below.
          </p>
        </div>
      ) : null}
      <section aria-labelledby="release-list-title">
        <div className={styles.listHeading}>
          <div className={styles.listTitle}>
            <h2 id="release-list-title">THE PUBLIC RELEASES</h2>
            <p>
              {published} {published === 1 ? "package" : "packages"}
              {testing > 0 && <span> · {testing} in testing</span>}
            </p>
          </div>
          <DownloadPlatformTabs platform={platform} query={query} />
        </div>
        <ul className={styles.list} aria-label="Project packages">
          {entries.map((entry) => (
            <DownloadPackageRow
              key={entry.project.id + entry.platform}
              project={entry.project}
              platform={entry.platform}
              policy={policy}
            />
          ))}
        </ul>
        {!entries.length && (
          <p className={styles.empty}>
            No projects match this search.{" "}
            <Link href="/downloads">Show all downloads</Link>
          </p>
        )}
      </section>
    </>
  );
}
