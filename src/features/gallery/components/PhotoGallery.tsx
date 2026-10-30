import type { ReactNode } from "react";
import Link from "@/components/ui/AppLink";
import { ArrowLeft, ArrowRight, Camera, Images } from "lucide-react";
import type { PublicPhoto } from "@/features/uploads/model/schema";
import styles from "./PhotoGallery.module.css";
import { PhotoGrid } from "./PhotoGrid";

export function PhotoGallery({
  photos,
  unavailable,
  page,
  nextPage,
  ownerActions,
}: {
  photos: PublicPhoto[];
  unavailable: boolean;
  page: number;
  nextPage: number | null;
  ownerActions?: ReactNode;
}) {
  return (
    <main id="main" className={`container ${styles.page}`}>
      <header className={styles.heading}>
        <div>
          <p className="eyebrow">A LITTLE OUTSIDE THE CODE</p>
          <h1>
            Collected moments<span>.</span>
          </h1>
          <p>A few photos, a few details, and the things I want to remember.</p>
        </div>
        <span className={styles.stamp}>
          <Camera size={22} strokeWidth={1.3} /> THE PHOTO JOURNAL{" "}
          <span>ROWELL / NIKUSHIMI</span>
        </span>
      </header>
      {ownerActions}
      <div className={styles.rule}>
        <span>
          <Images size={13} /> THE GALLERY
        </span>
        <Link href="/updates" className="text-link">
          Notes & progress <ArrowRight size={13} />
        </Link>
      </div>
      {unavailable ? (
        <div className={styles.empty} role="status">
          <Camera size={35} />
          <h2>The gallery is taking a moment.</h2>
          <p>Please try again in a little while.</p>
          <Link href="/gallery" className="button secondary">
            Try again
          </Link>
        </div>
      ) : photos.length ? (
        <PhotoGrid photos={photos} page={page} />
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyArt}>
            <Camera size={42} strokeWidth={1} />
            <span />
          </span>
          <p className="eyebrow">ROOM FOR SOMETHING GOOD</p>
          <h2>
            {page > 1
              ? "You’ve reached the last frame."
              : "The first frame is still to come."}
          </h2>
          <p>
            {page > 1
              ? "Head back to the latest moments."
              : "Photos will find their way here. Until then, there’s plenty being built."}
          </p>
          <Link
            href={page > 1 ? "/gallery" : "/projects"}
            className="text-link"
          >
            {page > 1 ? "Latest photos" : "Explore the projects"}{" "}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {(page > 1 || nextPage) && (
        <nav className={styles.pagination} aria-label="Gallery pages">
          {page > 1 && (
            <Link
              className="button secondary"
              href={`/gallery?page=${page - 1}`}
            >
              <ArrowLeft size={14} /> Newer photos
            </Link>
          )}
          {nextPage && (
            <Link
              className="button secondary"
              href={`/gallery?page=${nextPage}`}
            >
              Older photos <ArrowRight size={14} />
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
