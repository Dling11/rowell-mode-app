import Image from "next/image";
import { Swords } from "lucide-react";
import { ProjectIcon } from "./ProjectIcon";
import styles from "@/features/projects/components/Projects.module.css";

export function ProjectVisual({
  id,
  large = false,
  coverImage,
}: {
  id: string;
  large?: boolean;
  coverImage?: { src: string; alt: string };
}) {
  if (coverImage)
    return (
      <div
        className={`${styles.visual} ${large ? styles.visualLarge : ""} ${styles.customVisual}`}
      >
        <Image
          src={coverImage.src}
          alt={coverImage.alt}
          fill
          unoptimized
          sizes="(max-width: 620px) 100vw, 600px"
          priority={large}
        />
      </div>
    );
  return (
    <div
      className={`${styles.visual} ${styles[id === "mh-tri" ? "tri" : id === "share-mode" ? "share" : "mh4"]} ${large ? styles.visualLarge : ""}`}
      aria-hidden="true"
    >
      <div className={styles.visualGrid} />
      <span className={styles.visualNumber}>
        {id === "mh-tri" ? "III" : id === "share-mode" ? "↔" : "IV"}
      </span>
      {id === "mh-tri" ? (
        <div className={styles.appIcon}>
          <Image
            src="/images/mh-tri-icon.png"
            alt=""
            width={84}
            height={84}
            priority={large}
          />
        </div>
      ) : id === "share-mode" ? (
        <div className={styles.shareIcon}>
          <ProjectIcon id="share-mode" size={83} />
        </div>
      ) : (
        <div className={styles.swordIcon}>
          <Swords size={54} strokeWidth={1} />
        </div>
      )}
      <span className={styles.visualCaption}>
        {id === "mh-tri"
          ? "A NEW WAY TO HUNT"
          : id === "share-mode"
            ? "LESS FRICTION. MORE SHARING."
            : "THE NEXT ADVENTURE"}
      </span>
      <span className={styles.visualCorner}>
        R / {id === "mh-tri" ? "01" : id === "share-mode" ? "02" : "03"}
      </span>
    </div>
  );
}
