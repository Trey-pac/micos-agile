const fs = require('fs');
const path = require('path');

function makeSVG(size) {
  const fontSize = Math.round(size * 0.55);
  const rx = Math.round(size * 0.15);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#111827"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui,-apple-system,sans-serif" font-weight="900"
        font-size="${fontSize}" fill="#22c55e">M</text>
</svg>`;
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

[192, 512].forEach(size => {
  const svg = makeSVG(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.svg`), svg);
  console.log(`Wrote icon-${size}.svg`);
});

// Also create a simple PNG fallback using a BMP-like approach
// For proper PWA we need PNGs. We'll create minimal valid PNGs.
// Using a pure-JS minimal PNG encoder for solid background + letter

function createMinimalPNG(width, height, bgR, bgG, bgB) {
  // Create a minimal solid-color PNG
  const { deflateSync } = require('zlib');

  // RGBA pixel data
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 4);
    rawData[offset] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4;
      // Draw a dark background with green "M" region in center
      const cx = width / 2;
      const cy = height / 2;
      const letterSize = width * 0.35;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      if (dx < letterSize && dy < letterSize) {
        // Green zone (letter area) — just make it green for placeholder
        rawData[px] = 0x22;     // R
        rawData[px + 1] = 0xc5; // G
        rawData[px + 2] = 0x5e; // B
        rawData[px + 3] = 255;
      } else {
        rawData[px] = bgR;
        rawData[px + 1] = bgG;
        rawData[px + 2] = bgB;
        rawData[px + 3] = 255;
      }
    }
  }

  const compressed = deflateSync(rawData);

  // Build PNG file
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = (cc & 1) ? (0xEDB88320 ^ (cc >>> 1)) : (cc >>> 1);
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBytes, data]);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

[192, 512].forEach(size => {
  const png = createMinimalPNG(size, size, 0x11, 0x18, 0x27);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`Wrote icon-${size}.png (${png.length} bytes)`);
});

console.log('Done! Icons in public/icons/');
