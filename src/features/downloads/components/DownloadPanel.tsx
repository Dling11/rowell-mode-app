import {
  Download,
  Smartphone,
  Monitor,
  Code2,
  PauseCircle,
  ArrowUpRight,
} from "lucide-react";
import type { Project } from "@/features/projects/model/types";
import {
  downloadsAllowed,
  type SitePolicy,
} from "@/features/site-settings/model/policy";
import styles from "@/features/downloads/components/Downloads.module.css";

export function DownloadPanel({
  project,
  policy,
}: {
  project: Project;
  policy: SitePolicy;
}) {
  const allowed = downloadsAllowed(policy, project.id);
  return (
    <section className={styles.panel} aria-label="Get this project">
      <p className="eyebrow">
        {project.release ? "GET THE APP" : "ON THE WORKBENCH"}
      </p>
      <h2>
        {project.release
          ? project.version
            ? `Version ${project.version}`
            : "Approved releases"
          : "Still taking shape."}
      </h2>
      <p className={styles.label}>{project.releaseLabel}</p>
      {project.release ? (
        <>
          <p className={styles.hint}>
            {project.id === "share-mode" && project.version === "1.0.2"
              ? "This older public build uses the Share-Me-Rowell name. Newer work is not included."
              : "Choose your platform. Packages are hosted on GitHub Releases."}
          </p>
          {allowed ? (
            project.platforms.map((platform) => (
              <a
                key={platform}
                className={`button ${styles.download}`}
                href={`/download/${project.id}/${platform}`}
              >
                <span>
                  {platform === "android" ? (
                    <Smartphone size={17} />
                  ) : (
                    <Monitor size={17} />
                  )}{" "}
                  {platform === "android" ? "Android APK" : "Windows ZIP"}
                  {project.approvedTags?.[platform] && (
                    <small>{project.approvedTags[platform]}</small>
                  )}
                </span>
                <Download size={16} />
              </a>
            ))
          ) : (
            <div className={styles.paused} role="status">
              <PauseCircle size={20} />
              <div>
                <strong>Downloads temporarily unavailable</strong>
                <p>
                  {!policy.available
                    ? "Please check back soon."
                    : policy.message ||
                      "Downloads are paused while updates are in progress."}
                </p>
              </div>
            </div>
          )}
          <p className={styles.small}>
            Check the published release notes before installing.
          </p>
        </>
      ) : (
        <>
          <p className={styles.hint}>
            There’s no public APK yet. You can explore the source and follow the
            project on GitHub.
          </p>
          <a
            className={`button secondary ${styles.download}`}
            href={project.repository}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} /> Explore source code <ArrowUpRight size={15} />
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        </>
      )}
      {project.release && (
        <a
          className="text-link"
          href={project.release}
          target="_blank"
          rel="noreferrer"
        >
          Read release notes <ArrowUpRight size={13} />
          <span className="sr-only"> (opens a new tab)</span>
        </a>
      )}
    </section>
  );
}
