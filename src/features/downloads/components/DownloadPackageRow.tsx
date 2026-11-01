import Link from "@/components/ui/AppLink";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Code2,
  Monitor,
  Smartphone,
  PauseCircle,
} from "lucide-react";
import { ProjectIcon } from "@/features/projects/components/ProjectIcon";
import type { Project, Platform } from "@/features/projects/model/types";
import {
  downloadsAllowed,
  type SitePolicy,
} from "@/features/site-settings/model/policy";
import styles from "./DownloadsDirectory.module.css";
import { DownloadLink } from "./DownloadLink";

export function DownloadPackageRow({
  project,
  platform,
  policy,
}: {
  project: Project;
  platform: Platform;
  policy: SitePolicy;
}) {
  const published = Boolean(project.release);
  const allowed =
    published &&
    downloadsAllowed(policy, project.id) &&
    (!project.approvedTags || Boolean(project.approvedTags[platform]));
  const paused = policy.available && !downloadsAllowed(policy, project.id);
  const tag = project.approvedTags?.[platform] || project.version;
  return (
    <li
      className={styles.row}
      data-release={published ? "published" : "source-only"}
    >
      <div
        className={`${styles.icon} ${!published ? styles.testingIcon : ""}`}
        aria-hidden="true"
      >
        <ProjectIcon id={project.id} />
      </div>
      <div className={styles.project}>
        <Link href={`/projects/${project.id}`}>
          <h3>{project.name}</h3>
        </Link>
        <p>{project.experimental ? project.releaseLabel : published ? project.releaseLabel : "In testing · Source only"}</p>
        {project.release ? (
          <a href={project.release} target="_blank" rel="noreferrer">
            Release notes <ArrowUpRight size={11} />
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        ) : (
          <span className={styles.sourceNote}>{project.experimental && paused ? "Downloads temporarily unavailable" : "No public installer yet"}</span>
        )}
      </div>
      <div className={styles.platform}>
        {platform === "android" ? (
          <Smartphone size={17} />
        ) : (
          <Monitor size={17} />
        )}
        <span>
          {platform === "android" ? "Android" : "PC / Windows"}
          <small>
            {project.packageLabels?.[platform] || (published
              ? platform === "android"
                ? "APK installer"
                : "Portable ZIP"
              : "In development")}
          </small>
        </span>
      </div>
      <div className={styles.version}>
        {published ? (
          <>
            <span>{tag}</span>
            <small>
              {allowed
                ? "Ready to download"
                : paused
                  ? "Currently paused"
                  : "Temporarily unavailable"}
            </small>
          </>
        ) : (
          <>
            <span className={styles.testingBadge}>In testing</span>
            <small>{project.experimental ? paused ? "Downloads paused" : "Release pending" : "No public APK"}</small>
          </>
        )}
      </div>
      {!published ? (
        <Link
          className={`button secondary ${styles.action}`}
          href={`/projects/${project.id}`}
          aria-label={`View ${project.name} project`}
        >
          <Code2 size={16} />
          View project
        </Link>
      ) : allowed ? (
        <DownloadLink
          className={`button ${styles.action}`}
          href={`/download/${project.id}/${platform}`}
          aria-label={`Download ${project.name} for ${platform === "android" ? "Android" : "Windows"}`}
        >
          <ArrowDownToLine size={16} />
          Download
        </DownloadLink>
      ) : (
        <button
          className={`button secondary ${styles.action}`}
          disabled
          aria-label={`${project.name} ${platform} download is ${paused ? "paused" : "unavailable"}`}
        >
          <PauseCircle size={16} />
          {paused ? "Paused" : "Unavailable"}
        </button>
      )}
    </li>
  );
}
