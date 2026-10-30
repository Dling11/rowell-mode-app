import type { Metadata } from "next";
import { PhotoGallery } from "@/features/gallery/components/PhotoGallery";
import { getPublicGallery } from "@/server/db/gallery";
import { getOwner } from "@/server/auth/session";
import { QuickActions } from "@/components/workspace/QuickActions";
export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos and collected moments from Rowell / Nikushimi.",
};
export const dynamic = "force-dynamic";
export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const input = Number((await searchParams).page || 1);
  const page =
    Number.isSafeInteger(input) && input > 0 && input <= 1000 ? input : 1;
  const [gallery, owner] = await Promise.all([
    getPublicGallery(page),
    getOwner(),
  ]);
  return (
    <PhotoGallery
      {...gallery}
      page={page}
      ownerActions={owner ? <QuickActions kind="photo" /> : null}
    />
  );
}
