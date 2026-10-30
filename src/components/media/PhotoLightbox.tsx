"use client";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import { useMotionPreference } from "@/features/appearance/hooks/useMotionPreference";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";

export type PhotoSlide = { src: string; alt: string; title?: string; description?: string };
export default function PhotoLightbox({ slides, index = 0, onClose }: { slides: PhotoSlide[]; index?: number; onClose: () => void }) {
  const { reduced } = useMotionPreference();
  return <Lightbox open close={onClose} slides={slides} index={index} plugins={[Zoom, Captions, Fullscreen]} zoom={{ maxZoomPixelRatio: 2 }} carousel={{ finite: true, preload: 1 }} controller={{ aria: true, closeOnBackdropClick: true }} animation={{ fade: reduced ? 0 : 220, swipe: reduced ? 0 : 280 }} styles={{ container: { backgroundColor: "rgba(5, 10, 18, .98)" } }} />;
}
