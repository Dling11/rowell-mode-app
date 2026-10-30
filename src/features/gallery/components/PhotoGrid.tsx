"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import type { PublicPhoto } from "@/features/uploads/model/schema";
import { NavigationFeedback } from "@/components/ui/NavigationFeedback";
import styles from "./PhotoGallery.module.css";

const PhotoLightbox = dynamic(() => import("@/components/media/PhotoLightbox"), { ssr: false, loading: () => <NavigationFeedback pending label="Opening photo…" /> });
export function PhotoGrid({ photos, page }: { photos: PublicPhoto[]; page: number }) {
  const [index, setIndex] = useState(-1);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const slides = photos.map((photo) => ({ src: `/media/${photo.id}`, alt: photo.alt, title: photo.caption, description: new Date(photo.publishedAt).toLocaleDateString("en", { dateStyle: "long", timeZone: "UTC" }) }));
  return <>
    <div className={styles.grid}>
      {photos.map((photo, position) => <figure className={styles.photo} key={photo.id}>
        <button className={styles.frame} type="button" aria-label={`Preview photo: ${photo.caption || photo.alt}`} onClick={(event) => { trigger.current = event.currentTarget; setIndex(position); }}>
          <Image src={`/media/${photo.id}`} alt={photo.alt} width={1200} height={1200} unoptimized loading="lazy" />
          <span className={styles.expand}><ZoomIn size={15} /> View photo</span>
        </button>
        <figcaption><span className={styles.number}>{String((page - 1) * 18 + position + 1).padStart(2, "0")}</span><div>{photo.caption && <p>{photo.caption}</p>}<time dateTime={photo.publishedAt}>{new Date(photo.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></div></figcaption>
      </figure>)}
    </div>
    {index >= 0 && <PhotoLightbox slides={slides} index={index} onClose={() => { setIndex(-1); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </>;
}
