import { LoadingState } from "@/components/ui/LoadingState";
export default function GalleryLoading() {
  return (
    <main id="main" className="container" style={{ paddingBlock: 80 }}>
      <LoadingState label="Loading the gallery…" />
    </main>
  );
}
