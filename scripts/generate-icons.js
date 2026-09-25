import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(crcData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;
  const safeRadius = isMaskable ? maxR * 0.72 : maxR * 0.88;

  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);

      let r = 15, g = 10, b = 28, a = 255; // Dark neon background

      if (isMaskable) {
        // Full bleed background
        r = 14; g = 8; b = 30;
      }

      // Vinyl outer disk
      if (dist < safeRadius && dist > safeRadius * 0.35) {
        const groove = Math.sin(dist * 0.85);
        if (groove > 0.4) {
          r = 28; g = 26; b = 44;
        } else {
          r = 20; g = 18; b = 34;
        }
        // Vinyl sheen highlight
        const angle = Math.atan2(dy, dx);
        const sheen = Math.abs(Math.sin(angle * 2));
        if (sheen > 0.75) {
          r = Math.min(255, r + 45);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 65);
        }
      }

      // Neon center record label
      if (dist <= safeRadius * 0.35) {
        // Gradient cyan -> purple -> pink
        const t = (dx + safeRadius * 0.35) / (safeRadius * 0.7);
        r = Math.round(6 + t * 230);
        g = Math.round(182 - t * 110);
        b = Math.round(212 - t * 60);
      }

      // Spindle hole
      if (dist <= safeRadius * 0.08) {
        r = 240; g = 240; b = 255;
      }

      // Outer neon border ring
      if (Math.abs(dist - safeRadius) < Math.max(2, width * 0.015)) {
        r = 6; g = 182; b = 212; // Cyan neon
      }

      rawScanlines[offset++] = r;
      rawScanlines[offset++] = g;
      rawScanlines[offset++] = b;
      rawScanlines[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawScanlines);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('Successfully generated all PWA icons!');
