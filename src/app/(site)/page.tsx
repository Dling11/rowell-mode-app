import Link from "@/components/ui/AppLink";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Code2 as Github,
  Heart,
  Play,
} from "lucide-react";
import { creator } from "@/data/projects";
import { getPublicProjects } from "@/server/db/projects";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { ProjectSpotlight } from "@/features/projects/components/ProjectSpotlight";
import { SpotlightSlide } from "@/features/projects/components/SpotlightSlide";
import styles from "@/app/(site)/page.module.css";

export default async function HomePage() {
  const projects = await getPublicProjects();
  return (
    <main id="main" className="container">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <div className={styles.intro}>
            <span className={styles.introLine} /> A DEVELOPER’S PERSONAL SPACE
          </div>
          <h1 id="hero-title">
            A little curiosity.
            <br />
            <span>A lot of building.</span>
          </h1>
          <p>
            I’m Rowell, also known as Nikushimi. I make useful apps, tinker with
            community projects, and share what I learn along the way.
          </p>
          <div className={styles.heroActions}>
            <a className="button" href="#projects">
              Explore my projects <ArrowDown size={15} />
            </a>
            <a
              href={creator.github}
              target="_blank"
              rel="noreferrer"
              className={styles.heroGithub}
            >
              <Github size={16} /> Find me on GitHub <ArrowUpRight size={13} />
              <span className="sr-only"> (opens a new tab)</span>
            </a>
          </div>
          <div className={styles.heroFootnote}>
            <span /> Independently built. Always a work in progress.
          </div>
        </div>
        <ProjectSpotlight names={projects.map((project) => project.name)}>
          {projects.map((project) => (
            <SpotlightSlide key={project.id} project={project} />
          ))}
        </ProjectSpotlight>
      </section>
      <div className={styles.divider}>
        <span>APPS, EXPERIMENTS & THINGS IN BETWEEN</span>
        <span>
          SCROLL TO EXPLORE <ArrowDown size={11} />
        </span>
      </div>
      <section
        id="projects"
        className={styles.projectSection}
        aria-labelledby="projects-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2 id="projects-title">
              Things I’m working on<span>.</span>
            </h2>
          </div>
          <Link href="/projects" className="text-link">
            All projects <ArrowRight size={15} />
          </Link>
        </div>
        <div className={styles.projectGrid}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>
      <section className={styles.beyond} aria-labelledby="beyond-title">
        <div className={styles.beyondIntro}>
          <p className="eyebrow">BEYOND THE CODE</p>
          <h2 id="beyond-title">
            Building is better
            <br />
            when it’s shared.
          </h2>
          <p>
            A place for the process, the discoveries, and the occasional detour.
          </p>
          <Link href="/about" className="text-link">
            A little more about me <ArrowRight size={14} />
          </Link>
        </div>
        <a
          className={styles.channelCard}
          href={creator.youtube}
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.channelTop}>
            <span className={styles.playIcon}>
              <Play size={21} />
            </span>
            <ArrowUpRight size={19} />
          </div>
          <span className={styles.channelLabel}>ON YOUTUBE</span>
          <h3>Nikushimi</h3>
          <p>Gameplay, projects, and the things that catch my interest.</p>
          <span className={styles.channelAction}>
            Visit the channel <ArrowRight size={14} />
          </span>
          <span className="sr-only"> (opens a new tab)</span>
        </a>
        <div className={styles.supportCard}>
          <Heart size={25} strokeWidth={1.3} />
          <h3>Like what I’m making?</h3>
          <p>
            Your support helps keep these little projects moving. Always
            appreciated, never expected.
          </p>
          <a
            className="text-link"
            href={creator.support}
            target="_blank"
            rel="noreferrer"
          >
            Support my work <ArrowUpRight size={14} />
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        </div>
      </section>
    </main>
  );
}
