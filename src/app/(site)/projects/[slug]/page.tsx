import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Code2 } from "lucide-react";
import { findProject } from "@/data/projects";
import { getPublicProjects } from "@/server/db/projects";
import { getSitePolicy } from "@/server/site-policy/service";
import { ProjectVisual } from "@/features/projects/components/ProjectVisual";
import { ProjectResources } from "@/features/projects/components/ProjectResources";
import { DownloadPanel } from "@/features/downloads/components/DownloadPanel";
import styles from "@/app/(site)/projects/[slug]/page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const project = findProject((await params).slug);
  return {
    title: project?.name || "Project not found",
    description: project?.description,
  };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [projects, policy] = await Promise.all([
    getPublicProjects(),
    getSitePolicy(),
  ]);
  const project = projects.find((p) => p.id === slug);
  if (!project) notFound();
  return (
    <main id="main" className="container">
      <Link href="/projects" className={styles.back}>
        <ArrowLeft size={14} /> All projects
      </Link>
      <div className={styles.layout}>
        <div>
          <header className={styles.intro}>
            <p className="eyebrow">{project.category}</p>
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </header>
          <div className={styles.meta}>
            <span>{project.status}</span>
            {project.platforms.map((p) => (
              <span key={p}>{p === "android" ? "Android" : "Windows"}</span>
            ))}
          </div>
          <ProjectVisual
            id={project.id}
            large
            coverImage={project.coverImage}
          />
          <section className={styles.section}>
            <h2>The small details matter.</h2>
            <ul className={styles.highlights}>
              {project.highlights.map((h) => (
                <li key={h}>
                  <Check size={15} />
                  {h}
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.section}>
            <h2>
              {project.release ? "Getting started" : "Follow the project"}
            </h2>
            <ol className={styles.setup}>
              {project.setup.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </section>
          <ProjectResources project={project} />
          <div className={styles.credits}>
            <p>{project.attribution}</p>
            <div className={styles.sourceLinks}>
              <a
                className="text-link"
                href={project.repository}
                target="_blank"
                rel="noreferrer"
              >
                <Code2 size={15} /> Source code <ArrowUpRight size={13} />
                <span className="sr-only"> (opens a new tab)</span>
              </a>
              {project.credits && (
                <a
                  href={project.credits}
                  className="text-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Full credits <ArrowUpRight size={13} />
                  <span className="sr-only"> (opens a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <aside className={styles.aside}>
          <DownloadPanel project={project} policy={policy} />
        </aside>
      </div>
    </main>
  );
}
