// Studio media helpers (piece C, CHG-0099). Reads the real pixel size of PNG, JPEG and WebP images and the display size and length of
// MP4 and MOV files from their own headers, and crops a PNG to 4:5 without any image library. Server use only (node:zlib).
//
// The MP4 reader is best-effort: it walks the box tree (moov > trak > tkhd, moov > mvhd) of the whole file, takes the first track with
// a non-zero size as the video track, and swaps width and height when the track matrix rotates the picture by 90 or 270 degrees (phones
// record portrait video that way). It does not decode the video stream, so a file whose tkhd size disagrees with its coded size, or a
// fragmented MP4 without a tkhd size, reports what the container says or nothing.
import { deflateSync, inflateSync } from "node:zlib";

export type MediaInfo = { width: number; height: number; seconds?: number };

const u16 = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const le16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const le24 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
const ok = (w: number, h: number) => Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 100000 && h <= 100000;

function png(b: Uint8Array): MediaInfo | undefined {
  if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return undefined;
  const width = u32(b, 16), height = u32(b, 20);
  return ok(width, height) ? { width, height } : undefined;
}
function jpeg(b: Uint8Array): MediaInfo | undefined {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return undefined;
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    const length = u16(b, i + 2);
    // Start of frame markers carry the size; C4 (huffman), C8 (reserved) and CC (arithmetic) do not.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = u16(b, i + 5), width = u16(b, i + 7);
      return ok(width, height) ? { width, height } : undefined;
    }
    if (marker === 0xda || length < 2) return undefined;
    i += 2 + length;
  }
  return undefined;
}
function webp(b: Uint8Array): MediaInfo | undefined {
  if (b.length < 30) return undefined;
  const chunk = ascii(b, 12, 4);
  let width = 0, height = 0;
  if (chunk === "VP8 ") { width = le16(b, 26) & 0x3fff; height = le16(b, 28) & 0x3fff; }
  else if (chunk === "VP8L") { const v = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0; width = (v & 0x3fff) + 1; height = ((v >>> 14) & 0x3fff) + 1; }
  else if (chunk === "VP8X") { width = le24(b, 24) + 1; height = le24(b, 27) + 1; }
  return ok(width, height) ? { width, height } : undefined;
}
type Box = { type: string; start: number; end: number };
function boxes(b: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = [];
  let i = start;
  while (i + 8 <= end && out.length < 10000) {
    let size = u32(b, i);
    const type = ascii(b, i + 4, 4);
    let header = 8;
    if (size === 1) {
      if (i + 16 > end) break;
      size = u32(b, i + 8) * 2 ** 32 + u32(b, i + 12);
      header = 16;
    } else if (size === 0) size = end - i;
    if (size < header || i + size > end) break;
    out.push({ type, start: i + header, end: i + size });
    i += size;
  }
  return out;
}
function mp4(b: Uint8Array): MediaInfo | undefined {
  const moov = boxes(b, 0, b.length).find((x) => x.type === "moov");
  if (!moov) return undefined;
  const inner = boxes(b, moov.start, moov.end);
  let seconds: number | undefined;
  const mvhd = inner.find((x) => x.type === "mvhd");
  if (mvhd) {
    const v = b[mvhd.start];
    const scale = v === 1 ? u32(b, mvhd.start + 20) : u32(b, mvhd.start + 12);
    const duration = v === 1 ? u32(b, mvhd.start + 24) * 2 ** 32 + u32(b, mvhd.start + 28) : u32(b, mvhd.start + 16);
    if (scale > 0 && duration > 0) seconds = Math.round((duration / scale) * 100) / 100;
  }
  for (const trak of inner.filter((x) => x.type === "trak")) {
    const tkhd = boxes(b, trak.start, trak.end).find((x) => x.type === "tkhd");
    if (!tkhd) continue;
    const v = b[tkhd.start];
    const matrix = tkhd.start + 4 + (v === 1 ? 32 : 20) + 8 + 2 + 2 + 2 + 2;
    const sizeAt = matrix + 36;
    if (sizeAt + 8 > tkhd.end) continue;
    let width = Math.round(u32(b, sizeAt) / 65536), height = Math.round(u32(b, sizeAt + 4) / 65536);
    if (!width || !height) continue;
    // Matrix a b u / c d v / x y w (16.16): a = d = 0 means a quarter turn, so the picture is shown with width and height swapped.
    const a = u32(b, matrix) | 0, d = u32(b, matrix + 16) | 0;
    if (a === 0 && d === 0) [width, height] = [height, width];
    if (ok(width, height)) return { width, height, ...(seconds !== undefined ? { seconds } : {}) };
  }
  return undefined;
}
/** Pixel size (and length for video) of a PNG, JPEG, WebP, MP4 or MOV file from its header, or undefined when it cannot be read. */
export function mediaInfo(bytes: Uint8Array, mime: string): MediaInfo | undefined {
  try {
    if (mime === "image/png") return png(bytes);
    if (mime === "image/jpeg") return jpeg(bytes);
    if (mime === "image/webp") return webp(bytes);
    if (mime === "video/mp4" || mime === "video/quicktime") return mp4(bytes);
  } catch {
    return undefined;
  }
  return undefined;
}

// ---------- PNG crop (8-bit and 16-bit, non-interlaced) ----------

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of bytes) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
/** Encode raw scanlines (filter byte 0 on every row) as a PNG. Used by the crop and by tests to build real fixtures. */
export function encodePng(width: number, height: number, colourType: 0 | 2 | 3 | 4 | 6, rows: Uint8Array[], extra: { type: string; data: Uint8Array }[] = [], bitDepth: 8 | 16 = 8): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colourType;
  const raw = Buffer.concat(rows.map((r) => Buffer.concat([Buffer.from([0]), Buffer.from(r)])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), ...extra.map((c) => chunk(c.type, c.data)), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))]);
}
/** Decode a non-interlaced 8 or 16-bit PNG into unfiltered rows. Throws on anything else. */
export function decodePng(bytes: Uint8Array): { width: number; height: number; colourType: number; bitDepth: number; rows: Uint8Array[]; extra: { type: string; data: Uint8Array }[] } {
  if (bytes.length < 33 || bytes[0] !== 0x89 || ascii(bytes, 1, 3) !== "PNG") throw new Error("Not a PNG");
  let i = 8, width = 0, height = 0, bitDepth = 0, colourType = -1, interlace = 0;
  const idat: Uint8Array[] = [];
  const extra: { type: string; data: Uint8Array }[] = [];
  while (i + 12 <= bytes.length) {
    const length = u32(bytes, i);
    const type = ascii(bytes, i + 4, 4);
    const data = bytes.subarray(i + 8, i + 8 + length);
    if (i + 12 + length > bytes.length) throw new Error("Truncated PNG");
    if (type === "IHDR") { width = u32(data, 0); height = u32(data, 4); bitDepth = data[8]; colourType = data[9]; interlace = data[12]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "PLTE" || type === "tRNS" || type === "sRGB" || type === "gAMA" || type === "cHRM" || type === "iCCP") extra.push({ type, data: new Uint8Array(data) });
    else if (type === "IEND") break;
    i += 12 + length;
  }
  if (!ok(width, height) || !(colourType in CHANNELS) || interlace !== 0 || (bitDepth !== 8 && bitDepth !== 16)) throw new Error("Unsupported PNG layout for cropping");
  const bpp = CHANNELS[colourType] * (bitDepth / 8);
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < height * (stride + 1)) throw new Error("PNG image data is short");
  const rows: Uint8Array[] = [];
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = new Uint8Array(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let add = 0;
      if (filter === 1) add = a;
      else if (filter === 2) add = b;
      else if (filter === 3) add = (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (filter !== 0) throw new Error("Unknown PNG filter");
      line[x] = (line[x] + add) & 0xff;
    }
    rows.push(line);
    prev = line;
  }
  return { width, height, colourType, bitDepth, rows, extra };
}
/**
 * Crop a PNG to the target aspect ratio (width / height) around its centre, keeping the full width when the image is too tall and the
 * full height when it is too wide. Returns the original bytes when they already match. Throws when the PNG cannot be read.
 */
export function cropPngToRatio(bytes: Uint8Array, ratio: number): { bytes: Buffer; width: number; height: number; cropped: boolean } {
  const img = decodePng(bytes);
  const current = img.width / img.height;
  if (Math.abs(current - ratio) / ratio < 0.005) return { bytes: Buffer.from(bytes), width: img.width, height: img.height, cropped: false };
  const bpp = CHANNELS[img.colourType] * (img.bitDepth / 8);
  let width = img.width, height = img.height, top = 0, left = 0;
  if (current < ratio) { height = Math.round(img.width / ratio); top = Math.floor((img.height - height) / 2); }
  else { width = Math.round(img.height * ratio); left = Math.floor((img.width - width) / 2); }
  const rows = img.rows.slice(top, top + height).map((r) => r.subarray(left * bpp, (left + width) * bpp));
  return { bytes: encodePng(width, height, img.colourType as 0 | 2 | 3 | 4 | 6, rows, img.extra, img.bitDepth as 8 | 16), width, height, cropped: true };
}

// ---------- Tiny valid MP4 (tests and documentation of the reader) ----------

function box(type: string, ...parts: Uint8Array[]): Buffer {
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + body.length, 0);
  head.write(type, 4, "ascii");
  return Buffer.concat([head, body]);
}
/**
 * A minimal MP4 container (ftyp, moov with mvhd and one video trak/tkhd, empty mdat) with the given display size and length. It has no
 * playable frames; it exists so the reader can be tested on a structurally real file. `rotate` writes a quarter-turn matrix.
 */
export function minimalMp4(width: number, height: number, seconds: number, rotate = false): Buffer {
  const ftyp = box("ftyp", Buffer.from("isom"), Buffer.from([0, 0, 2, 0]), Buffer.from("isomiso2mp41"));
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12); // timescale
  mvhd.writeUInt32BE(Math.round(seconds * 1000), 16); // duration
  mvhd.writeUInt32BE(0x00010000, 20); // rate 1.0
  mvhd.writeUInt16BE(0x0100, 24); // volume 1.0
  const unit = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
  unit.forEach((v, i) => mvhd.writeUInt32BE(v >>> 0, 36 + i * 4));
  mvhd.writeUInt32BE(2, 96); // next track id
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(0x00000003, 0); // version 0, flags enabled and in movie
  tkhd.writeUInt32BE(1, 12); // track id
  tkhd.writeUInt32BE(Math.round(seconds * 1000), 20); // duration
  const matrix = rotate ? [0, 0x00010000, 0, 0xffff0000, 0, 0, 0, 0, 0x40000000] : unit;
  matrix.forEach((v, i) => tkhd.writeUInt32BE(v >>> 0, 40 + i * 4));
  tkhd.writeUInt32BE(width * 65536, 76);
  tkhd.writeUInt32BE(height * 65536, 80);
  return Buffer.concat([ftyp, box("moov", box("mvhd", mvhd), box("trak", box("tkhd", tkhd))), box("mdat")]);
}
