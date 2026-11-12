import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Code2 } from "lucide-react";
import { findProject } from "@/data/projects";
import { getPublicProjects } from "@/server/db/projects";
import { getSitePolicy } from "@/server/site-policy/service";
import { ProjectVisual } from "@/features/projects/components/ProjectVisual";
import { ProjectResources } from "@/features/projects/components/ProjectResources";
import { getProjectWhatsNew } from "@/features/projects/model/release-notes";
import { DownloadPanel } from "@/features/downloads/components/DownloadPanel";
import { PhotoPreview } from "@/components/media/PhotoPreview";
import { ProjectIcon } from "@/features/projects/components/ProjectIcon";
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
  const whatsNew = getProjectWhatsNew(project);
  return (
    <main id="main" className="container">
      <Link href="/projects" className={styles.back}>
        <ArrowLeft size={14} /> All projects
      </Link>
      <div className={styles.layout}>
        <div>
          <header className={styles.intro}>
            <p className="eyebrow">{project.category}</p>
            {project.id.startsWith("mh4u") && <nav className={styles.editions} aria-label="MH4U app edition">
              <Link href="/projects/mh4u-native" aria-current={project.id === "mh4u-native" ? "page" : undefined}><ProjectIcon id="mh4u-native" size={30} /> Native</Link>
              <Link href="/projects/mh4u" aria-current={project.id === "mh4u" ? "page" : undefined}><ProjectIcon id="mh4u" size={30} /> Azahar</Link>
            </nav>}
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </header>
          <div className={styles.meta}>
            <span>{project.status}</span>
            {project.platforms.map((p) => (
              <span key={p}>{p === "android" ? "Android" : "Windows"}</span>
            ))}
          </div>
          {project.id.startsWith("mh4u") && project.coverImage ? <PhotoPreview className={styles.gameplay} src={project.coverImage.src} alt={project.coverImage.alt} caption="Gameplay from the Android setup tutorial. Menus may differ in newer releases." fit="contain" /> : <ProjectVisual
            id={project.id}
            large
            coverImage={project.coverImage}
          />}
          <section className={styles.section}>
            <h2>{whatsNew ? `What's new in ${whatsNew.version}` : "The small details matter."}</h2>
            <ul className={styles.highlights}>
              {(whatsNew?.items || project.highlights).map((h) => (
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
              href={project.sourceUrl || project.repository}
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
          <DownloadPanel project={project} policy={policy} relatedProject={projects.find((candidate) => candidate.id === project.relatedProjectId)} />
        </aside>
      </div>
    </main>
  );
}
