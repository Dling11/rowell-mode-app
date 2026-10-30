import Image from "next/image";

export function BrandMark({ size = 36 }: { size?: number }) {
  return <Image src="/icons/app-192.png" width={size} height={size} alt="" aria-hidden="true" style={{borderRadius:Math.round(size*.22),flexShrink:0}}/>;
}
