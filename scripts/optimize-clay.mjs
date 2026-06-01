/**
 * Strips near-white backgrounds and exports optimized WebP mascots.
 * Usage: node scripts/optimize-clay.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const INPUT_DIR = path.resolve(
  "C:/Users/Amass/.cursor/projects/d-THE-DEV-ENTROPY/assets"
);
const OUTPUT_DIR = path.resolve("public/clay");

const FILES = [
  { in: "clay-navigator-v2.png", out: "clay-navigator.webp" },
  { in: "clay-hourglass-v2.png", out: "clay-hourglass.webp" },
  { in: "clay-ladder-v2.png", out: "clay-ladder.webp" },
  { in: "clay-sprout-v2.png", out: "clay-sprout.webp" },
  { in: "clay-receipt-v2.png", out: "clay-receipt.webp" },
  { in: "clay-director-v2.png", out: "clay-director.webp" },
];

const WHITE_THRESHOLD = 248;
const EDGE_FUZZ = 12;

function removeWhiteBackground({ data, info }) {
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];

    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const isNearWhite = min >= WHITE_THRESHOLD - EDGE_FUZZ && max >= WHITE_THRESHOLD;
    const isLightGray =
      max - min < 18 && min >= WHITE_THRESHOLD - EDGE_FUZZ - 20 && max >= 225;

    if (isNearWhite || isLightGray) {
      out[idx + 3] = 0;
      continue;
    }

    if (min >= 220 && max >= 235) {
      const whiteness = (min - 220) / 35;
      out[idx + 3] = Math.round(out[idx + 3] * (1 - whiteness * 0.85));
    }
  }

  return out;
}

async function processFile({ in: inputName, out: outputName }) {
  const inputPath = path.join(INPUT_DIR, inputName);
  if (!fs.existsSync(inputPath)) {
    console.warn(`Skip missing: ${inputName}`);
    return;
  }

  const pipeline = sharp(inputPath).ensureAlpha().raw();
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  const cleaned = removeWhiteBackground({ data, info });

  const webpPath = path.join(OUTPUT_DIR, outputName);
  await sharp(cleaned, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(webpPath);

  const pngSize = fs.statSync(inputPath).size;
  const webpSize = fs.statSync(webpPath).size;
  const saved = (((pngSize - webpSize) / pngSize) * 100).toFixed(0);
  console.log(`${outputName}: ${(pngSize / 1024).toFixed(0)}KB → ${(webpSize / 1024).toFixed(0)}KB (${saved}% smaller)`);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const file of FILES) {
  await processFile(file);
}

console.log("Done.");
