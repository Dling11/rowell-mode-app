import type { Metadata } from "next";
import Link from "@/components/ui/AppLink";
import { SearchForm } from "@/components/ui/SearchForm";
import { getPublicProjects } from "@/server/db/projects";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import styles from "@/features/projects/components/Projects.module.css";

export const metadata: Metadata = { title: "Projects" };
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ platform?: string; q?: string }> }) {
  const params = await searchParams;
  const platform = ["android", "windows", "source"].includes(params.platform || "") ? params.platform : "all";
  const query = (typeof params.q === "string" ? params.q : "").slice(0, 100);
  const projects = (await getPublicProjects()).filter(project => (platform === "all" || (platform === "source" ? !project.release : project.platforms.includes(platform as "android"))) && `${project.name} ${project.description}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="container" id="main"><div className="page-intro"><p className="eyebrow">THE COLLECTION</p><h1>Projects & experiments<span style={{ color: "var(--blue)" }}>.</span></h1><p>A few useful things, some familiar adventures, and ideas still taking shape. Public releases and works in progress, all in one place.</p></div>
    <div className={styles.filterBar}><nav className={styles.tabs} aria-label="Filter projects">{[["all", "All projects"], ["android", "Android"], ["windows", "Windows"], ["source", "Source only"]].map(([id,label]) => <Link key={id} href={`/projects?${new URLSearchParams({ ...(id !== "all" ? {platform:id} : {}), ...(query ? {q:query} : {}) })}`} aria-current={platform === id ? "page" : undefined} prefetch={false}>{label}</Link>)}</nav><SearchForm className={styles.search} action="/projects" role="search" submitLabel="Search" submitClassName="button secondary"><input type="hidden" name="platform" value={platform}/><label className="sr-only" htmlFor="search-projects">Search projects</label><input className="input" id="search-projects" name="q" placeholder="Find a project…" maxLength={100} defaultValue={query}/></SearchForm></div>
    {projects.length ? <div className={styles.grid}>{projects.map(project=><ProjectCard key={project.id} project={project}/>)}</div> : <div className={styles.empty}><h2>No projects found.</h2><p>Try a different search or platform.</p><Link className="text-link" href="/projects">Clear filters</Link></div>}
  </main>;
}
