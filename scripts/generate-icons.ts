import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// The logo stays editable as SVG. This script creates the raster sizes phones and browsers expect.
const input = "public/brand/gardenbuddy-mark.svg";
await mkdir("public/brand", { recursive: true });
await Promise.all([
  sharp(input).resize(32, 32).png().toFile("public/brand/favicon-32.png"),
  sharp(input).resize(192, 192).png().toFile("public/brand/icon-192.png"),
  sharp(input).resize(512, 512).png().toFile("public/brand/icon-512.png"),
  sharp({
    create: { width: 180, height: 180, channels: 4, background: "#F5F0E8" },
  })
    .composite([
      {
        input: await sharp(input).resize(152, 152).png().toBuffer(),
        left: 14,
        top: 14,
      },
    ])
    .png()
    .toFile("public/brand/apple-touch-icon.png"),
]);
console.log("Generated favicon, 192px, 512px, and Apple touch icons.");
