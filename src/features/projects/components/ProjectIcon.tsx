import Image from "next/image";
import { Download, Swords } from "lucide-react";

const icons: Record<string, string> = {
  "mh-tri": "/images/mh-tri-icon.png",
  "mh-tri-low-spec": "/images/mh-tri-icon.png",
  "share-mode": "/images/share-mode-icon.svg",
  "mh4u": "/images/mh4u-azahar-icon.png",
  "mh4u-native": "/images/mh4u-native-icon.png",
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
  ) : id === "mdm" ? (
    <Download size={Math.round(size * 0.68)} aria-hidden="true" />
  ) : (
    <Swords size={Math.round(size * 0.68)} aria-hidden="true" />
  );
}
