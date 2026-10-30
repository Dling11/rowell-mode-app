import Link from "@/components/ui/AppLink";
import { ArrowUpRight, Monitor, Smartphone } from "lucide-react";
import type { Project } from "../model/types";
import { ProjectVisual } from "./ProjectVisual";
import styles from "./Spotlight.module.css";

export function SpotlightSlide({ project }: { project: Project }) {
  return (
    <>
      <div className={styles.art}>
        <ProjectVisual id={project.id} large coverImage={project.coverImage} />
      </div>
      <div className={styles.info}>
        <div>
          <span>{project.category}</span>
          <h2>{project.name}</h2>
          <p>
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
            {!project.release && <span>In testing</span>}
          </p>
        </div>
        <Link
          href={`/projects/${project.id}`}
          className={styles.explore}
          aria-label={`Explore ${project.name}`}
        >
          <ArrowUpRight size={23} />
        </Link>
      </div>
    </>
  );
}
