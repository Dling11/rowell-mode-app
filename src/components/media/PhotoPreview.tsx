"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { NavigationFeedback } from "@/components/ui/NavigationFeedback";
import styles from "./PhotoPreview.module.css";

const PhotoLightbox = dynamic(() => import("./PhotoLightbox"), { ssr: false, loading: () => <NavigationFeedback pending label="Opening photo…" /> });

export function PhotoPreview({ src, alt, caption, className = "", fit = "cover" }: { src: string; alt: string; caption?: string; className?: string; fit?: "cover" | "contain" }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={trigger} type="button" className={`${styles.trigger} ${className}`} data-fit={fit} aria-label={`Preview photo: ${caption || alt}`} onClick={() => setOpen(true)}>
      <Image src={src} alt={alt} width={1200} height={1200} unoptimized loading="lazy" />
      <span className={styles.expand}><ZoomIn size={15} /> View photo</span>
    </button>
    {open && <PhotoLightbox slides={[{ src, alt, title: caption }]} onClose={() => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); }} />}
  </>;
}
