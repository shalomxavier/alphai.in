import { Resvg } from '@resvg/resvg-js';
import wawoff2 from 'wawoff2';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// resvg's fontdb can't parse woff2 — decompress to ttf buffers first
const toTtf = async (p) => await wawoff2.decompress(readFileSync(p));
const [grotesk, mono] = await Promise.all([
  toTtf(join(root, 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2')),
  toTtf(join(root, 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')),
]);

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0b"/>
  <rect x="599.5" y="386" width="1" height="44" fill="#eceae4" opacity="0.25"/>
  <text x="600" y="330" font-family="Space Grotesk" font-size="156" font-weight="500" letter-spacing="-4" fill="#eceae4" text-anchor="middle">ALPHAI</text>
  <text x="600" y="478" font-family="JetBrains Mono" font-size="21" letter-spacing="4.5" fill="#8f8e89" text-anchor="middle">TECHNOLOGY &amp; DIGITAL SYSTEMS</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    fontBuffers: [grotesk, mono],
    loadSystemFonts: false,
  },
});

writeFileSync(join(root, 'public/og.png'), resvg.render().asPng());
console.log('public/og.png written');
