import Link from "@/components/ui/AppLink";
import { ArrowUpRight } from "lucide-react";
import { creator } from "@/data/projects";
import { site } from "@/data/site";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "@/components/layout/Shell.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link
          href="/"
          className={styles.brand}
          aria-label={`${site.name} home`}
        >
          <BrandMark size={38} />
          <span>
            {site.name}
            <span className={styles.brandSuffix}> / nikushimi</span>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/projects">Projects</Link>
          <Link href="/downloads">Downloads</Link>
          <Link href="/updates">Updates</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/about">About</Link>
        </nav>
        <a
          className={styles.headerLink}
          href={creator.github}
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowUpRight size={15} />
          <span className="sr-only"> (opens a new tab)</span>
        </a>
      </div>
    </header>
  );
}
