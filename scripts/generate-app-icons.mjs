import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = await readFile("public/brand/rowell-mode-icon.png");
await mkdir("public/icons", { recursive: true });
for (const size of [192, 512]) {
  await sharp(source).resize(size, size).png().toFile(`public/icons/app-${size}.png`);
}
await sharp(source).resize(512, 512).flatten({ background: "#111c2d" }).png().toFile("public/icons/app-maskable-512.png");
await sharp(source).resize(180, 180).flatten({ background: "#111c2d" }).png().toFile("public/icons/apple-touch-icon.png");
await sharp(source).resize(64, 64).png().toFile("src/app/icon.png");
console.log("Generated app icons from the source mark.");
