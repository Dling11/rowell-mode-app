import Link from "next/link";
import { ArrowRight, Smartphone, Monitor, ArrowUpRight } from "lucide-react";
import type { Project } from "@/features/projects/model/types";
import { ProjectVisual } from "@/features/projects/components/ProjectVisual";
import styles from "@/features/projects/components/Projects.module.css";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={styles.card}>
      <Link
        href={`/projects/${project.id}`}
        className={styles.visualLink}
        tabIndex={-1}
        aria-hidden="true"
      >
        <ProjectVisual id={project.id} coverImage={project.coverImage} />
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span>{project.category}</span>
          <span
            className={`${styles.status} ${project.status === "Released" ? styles.released : styles.testing}`}
          >
            <span />
            {project.status}
          </span>
        </div>
        <div className={styles.cardTitle}>
          <h3>
            <Link href={`/projects/${project.id}`}>{project.name}</Link>
          </h3>
          {project.version && <span>v{project.version}</span>}
        </div>
        <p className={styles.summary}>{project.summary}</p>
        <div className={styles.platforms}>
          {project.platforms.map((platform) => (
            <span key={platform}>
              {platform === "android" ? (
                <Smartphone size={12} />
              ) : (
                <Monitor size={12} />
              )}{" "}
              {platform === "android" ? "Android" : "Windows"}
            </span>
          ))}
        </div>
        <div className={styles.cardFooter}>
          <span>
            {project.id === "share-mode" && project.version === "1.0.2"
              ? "Public build: Share-Me 1.0.2"
              : project.releaseLabel}
          </span>
          <Link
            href={`/projects/${project.id}`}
            aria-label={`Explore ${project.name}`}
            className={styles.cardArrow}
          >
            {project.release ? (
              <ArrowRight size={18} />
            ) : (
              <ArrowUpRight size={18} />
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}
