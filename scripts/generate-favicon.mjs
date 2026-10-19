import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const svg = readFileSync(join(pub, 'alphai-logo.svg'), 'utf8');

// Tight art bounds — reframes the viewBox around the mark; geometry untouched.
const bbox = new Resvg(svg).getBBox();
if (!bbox) throw new Error('alphai-logo.svg has no renderable geometry');

// Square frame: mark fills the width, small even margin, vertically centered.
const PAD = bbox.width * 0.05;
const side = bbox.width + PAD * 2;
const vx = bbox.x - PAD;
const vy = bbox.y + bbox.height / 2 - side / 2;

const framed = svg
  .replace(/(<svg[^>]*\b)width="[^"]*"/, '$1width="512"')
  .replace(/(<svg[^>]*\b)height="[^"]*"/, '$1height="512"')
  .replace(
    /(<svg[^>]*\b)viewBox="[^"]*"/,
    `$1viewBox="${vx} ${vy} ${side} ${side}"`,
  );

const render = (size) =>
  new Resvg(framed, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  }).render();

const png = (size) => render(size).asPng();

// Sanity check — corners must be transparent and the mark should fill ~all of
// the canvas width.
const img = render(32);
const px = img.pixels;
let opaque = 0;
for (let i = 3; i < px.length; i += 4) if (px[i] > 0) opaque++;
const cornerAlpha = [px[3], px[(img.width - 1) * 4 + 3]];
console.log(
  `bbox ${bbox.width.toFixed(0)}x${bbox.height.toFixed(0)} · ` +
    `32px fill ${((opaque / (img.width * img.height)) * 100).toFixed(1)}% · ` +
    `corner alpha ${cornerAlpha.join(',')}`,
);

const frames = [16, 32, 48].map((size) => ({ size, buf: png(size) }));
writeFileSync(join(pub, 'favicon-16.png'), frames[0].buf);
writeFileSync(join(pub, 'favicon-32.png'), frames[1].buf);

// .ico container with PNG-compressed frames (supported by all modern browsers)
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = 6 + frames.length * 16;
const entries = frames.map(({ size, buf }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});
writeFileSync(
  join(pub, 'favicon.ico'),
  Buffer.concat([header, ...entries, ...frames.map((f) => f.buf)]),
);

console.log('public/favicon-16.png, favicon-32.png, favicon.ico written');
