import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(dirname(__filename), "../apps/web/public");
const source = readFileSync(resolve(root, "icon.svg"));
const outDir = resolve(root, "icons");
mkdirSync(outDir, { recursive: true });

async function png(size: number, name: string, padding = 0) {
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 79, g: 70, b: 229, alpha: 1 },
    },
  });
  const inner = Math.round(size - padding * 2);
  const icon = await sharp(source).resize(inner, inner).png().toBuffer();
  const buffer = await canvas
    .composite([{ input: icon, top: padding, left: padding }])
    .png()
    .toBuffer();
  writeFileSync(resolve(outDir, name), buffer);
}

async function og() {
  const width = 1200;
  const height = 630;
  const mark = await sharp(source).resize(160, 160).png().toBuffer();
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#EEF2FF"/>
          <stop offset="100%" stop-color="#ECFEFF"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="220" y="300" font-size="72" font-family="ui-sans-serif, system-ui" font-weight="700" fill="#0F172A">SnackCheck</text>
      <text x="220" y="360" font-size="28" font-family="ui-sans-serif, system-ui" fill="#475569">Scan it. Search it. Know before you bring it.</text>
    </svg>
  `);
  const buffer = await sharp(svg)
    .composite([{ input: mark, top: 214, left: 40 }])
    .png()
    .toBuffer();
  writeFileSync(resolve(outDir, "og.png"), buffer);
}

async function main() {
  await png(192, "icon-192.png");
  await png(512, "icon-512.png");
  await png(512, "icon-maskable-512.png", 64);
  await og();
  console.log("Wrote SnackCheck icons from public/icon.svg");
}

void main();
