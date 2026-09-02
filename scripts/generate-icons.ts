import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// The logo is a hand-pixeled 72x72 sprite. Upscaling uses nearest-neighbor so
// pixel edges stay crisp instead of blurring like a photo resize.
const input = "public/brand/gardenbuddy-mark.png";
const upscale = (size: number) =>
  sharp(input).resize(size, size, { kernel: sharp.kernel.nearest }).png();

await mkdir("public/brand", { recursive: true });
await Promise.all([
  sharp(input).resize(32, 32).png().toFile("public/brand/favicon-32.png"),
  upscale(192).toFile("public/brand/icon-192.png"),
  upscale(512).toFile("public/brand/icon-512.png"),
  sharp({
    create: { width: 180, height: 180, channels: 4, background: "#e7d3a8" },
  })
    .composite([{ input: await upscale(152).toBuffer(), left: 14, top: 14 }])
    .png()
    .toFile("public/brand/apple-touch-icon.png"),
]);
console.log("Generated favicon, 192px, 512px, and Apple touch icons.");
