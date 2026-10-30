import Link from "next/link";
import {
  Code2 as Github,
  Video as Youtube,
  Heart,
  ArrowUpRight,
  Smartphone,
} from "lucide-react";
import { creator } from "@/data/projects";
import { site } from "@/data/site";
import { BrandMark } from "@/components/layout/BrandMark";
import styles from "@/components/layout/Shell.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <div>
          <Link href="/" className={styles.footerBrand}>
            <BrandMark size={32} />
            {site.name}
          </Link>
          <p>Built with curiosity. Shared with you.</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/install">
            <Smartphone size={16} /> Install app
          </Link>
          <a href={creator.github} target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub
            <span className="sr-only"> (opens a new tab)</span>
          </a>
          <a href={creator.youtube} target="_blank" rel="noreferrer">
            <Youtube size={17} /> YouTube
            <span className="sr-only"> (opens a new tab)</span>
          </a>
          <a href={creator.support} target="_blank" rel="noreferrer">
            <Heart size={16} /> Support <ArrowUpRight size={12} />
            <span className="sr-only"> (opens a new tab)</span>
          </a>
        </div>
      </div>
      <div className={`container ${styles.footerBottom}`}>
        <span>© {new Date().getFullYear()} Rowell / Nikushimi</span>
        <span>A personal corner of the internet.</span>
        <Link
          href="/admin"
          prefetch={false}
          aria-label={`${site.name} owner sign-in`}
          className={styles.ownerLink}
        >
          {site.name}
        </Link>
      </div>
    </footer>
  );
}
