import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/data/site";

export const alt = "Rowell-Mode — Projects, public releases and collected moments.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/rowell-mode-icon.png"));
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#0b1220", color: "#eaf1f8", padding: "74px", alignItems: "center", gap: "54px" }}>
    {/* A public brand asset is embedded so rendering never requires a database or self-fetch. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`data:image/png;base64,${logo.toString("base64")}`} width={260} height={260} alt="" style={{ borderRadius: "48px" }} />
    <div style={{ display: "flex", flexDirection: "column", gap: "23px", flex: 1 }}><span style={{ color: "#8fafd1", fontSize: 18, letterSpacing: "4px" }}>ROWELL / NIKUSHIMI</span><span style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-3px" }}>{site.name}</span><div style={{ display: "flex", flexDirection: "column", fontSize: 27, lineHeight: 1.4, color: "#a6b5c7" }}><span>Projects, public releases</span><span>& collected moments.</span></div><span style={{ color: "#8fafd1", fontSize: 19, marginTop: 9 }}>rowell-mode-app.vercel.app</span></div>
  </div>, size);
}
