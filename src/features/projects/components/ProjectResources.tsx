import {
  ArrowUpRight,
  BookOpen,
  FileArchive,
  Globe,
  Code2,
} from "lucide-react";
import type { Project } from "../model/types";
import styles from "./ProjectResources.module.css";
const icons = {
  Website: Globe,
  "Game files": FileArchive,
  Documentation: BookOpen,
  Source: Code2,
};
export function ProjectResources({ project }: { project: Project }) {
  if (!project.resources?.length) return null;
  return (
    <section className={styles.section} aria-labelledby="resources-title">
      <p className="eyebrow">KEEPING THE TRAIL</p>
      <h2 id="resources-title">Resources & history.</h2>
      <p>Useful places to continue, collected alongside the project.</p>
      <ul>
        {project.resources.map((resource) => {
          const Icon = icons[resource.kind];
          return (
            <li key={`${resource.title}:${resource.url}`}>
              <a href={resource.url} target="_blank" rel="noreferrer noopener">
                <span className={styles.icon}>
                  <Icon size={18} />
                </span>
                <span>
                  <small>{resource.kind} · External reference</small>
                  <strong>{resource.title}</strong>
                  <span className={styles.host}>
                    {new URL(resource.url).hostname}
                  </span>
                </span>
                <ArrowUpRight size={17} />
                <span className="sr-only"> (opens a new tab)</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className={styles.foot}>
        {project.resourceUpdatedAt && (
          <>
            Links recorded{" "}
            <time dateTime={project.resourceUpdatedAt}>
              {new Date(project.resourceUpdatedAt).toLocaleDateString("en", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
            .{" "}
          </>
        )}
        External pages manage their own files and availability. Approved app
        installers are listed separately.
      </p>
    </section>
  );
}
