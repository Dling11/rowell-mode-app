import Image from "next/image";
import { Swords } from "lucide-react";

const icons: Record<string, string> = {
  "mh-tri": "/images/mh-tri-icon.png",
  "mh-tri-low-spec": "/images/mh-tri-icon.png",
  "share-mode": "/images/share-mode-icon.svg",
};

export function ProjectIcon({
  id,
  size = 44,
  priority = false,
}: {
  id: string;
  size?: number;
  priority?: boolean;
}) {
  return icons[id] ? (
    <Image
      src={icons[id]}
      alt=""
      width={size}
      height={size}
      priority={priority}
    />
  ) : (
    <Swords size={Math.round(size * 0.68)} aria-hidden="true" />
  );
}
