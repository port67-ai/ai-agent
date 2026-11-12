import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project, Strategy } from "./model";

// Template video render: three brand-coloured scenes drawn from the approved direction, joined with fades.
// No AI model and no third-party media are involved, so a render costs only a few seconds of server time.
export const SCENE_SECONDS = 5;
export const VIDEO_SIZE = 480; // draft size; 1080 is rendered only on request
export const VIDEO_SIZES = [480, 1080] as const;
export type VideoSize = (typeof VIDEO_SIZES)[number];
export type Scene = { kicker: string; text: string };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const COLOUR = /^#[0-9a-fA-F]{6}$/;
export const videoScenes = (p: Project, s: Strategy): Scene[] => [
  { kicker: p.brief.business, text: s.message },
  { kicker: "THE IDEA", text: p.brief.objective },
  { kicker: "YOUR NEXT STEP", text: s.cta },
];
function wrapText(text: string, max = 22, lines = 5) {
  const out: string[] = [];
  let line = "";
  for (const word of text.replace(/\s+/g, " ").trim().split(" ")) {
    if ((line + " " + word).trim().length > max && line) {
      out.push(line);
      line = word.slice(0, max * 2);
    } else line = (line + " " + word).trim();
  }
  if (line) out.push(line);
  return out.slice(0, lines).map((l, i, a) => (i === a.length - 1 && out.length > lines ? l.slice(0, Math.max(1, max - 1)) + "…" : l));
}
export function sceneSvg(p: Project, scene: Scene, index: number, size: number = VIDEO_SIZE) {
  const brand = COLOUR.test(p.brief.brandColor) ? p.brief.brandColor : "#1072ba";
  const lines = wrapText(scene.text);
  const logo = p.brief.logoData && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p.brief.logoData)
    ? `<image href="${p.brief.logoData}" x="800" y="60" width="200" height="100" preserveAspectRatio="xMidYMid meet"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#161d27"/><circle cx="${index % 2 ? 160 : 920}" cy="${index === 2 ? 900 : 120}" r="300" fill="${brand}" opacity=".22"/>${logo}<rect x="90" y="300" width="90" height="8" fill="${brand}"/><text x="90" y="260" font-family="DejaVu Sans" font-size="30" fill="${brand}">${esc(scene.kicker.toUpperCase().slice(0, 40))}</text>${lines.map((l, i) => `<text x="90" y="${400 + i * 92}" font-family="DejaVu Sans" font-weight="700" font-size="66" fill="#ffffff">${esc(l)}</text>`).join("")}<text x="90" y="1000" font-family="DejaVu Sans" font-size="22" fill="#929aa7">${esc(p.brief.business.slice(0, 50))} · concept video</text></svg>`;
}
export type Runner = (command: string, args: string[]) => Promise<void>;
const runFile: Runner = (command, args) => new Promise((resolve, reject) => execFile(command, args, { timeout: 120000, maxBuffer: 1 << 20 }, (e) => (e ? reject(new Error("Video encoder failed")) : resolve())));
export function encoderArgs(frames: string[], out: string) {
  const n = frames.length;
  const inputs = frames.flatMap((f) => ["-loop", "1", "-framerate", "25", "-t", String(SCENE_SECONDS), "-i", f]);
  const chains = frames.map((_, i) => `[${i}:v]fade=t=in:st=0:d=0.6,fade=t=out:st=${SCENE_SECONDS - 0.6}:d=0.6,format=yuv420p[v${i}]`);
  const join = frames.map((_, i) => `[v${i}]`).join("") + `concat=n=${n}:v=1:a=0[out]`;
  return ["-y", "-loglevel", "error", ...inputs, "-filter_complex", [...chains, join].join(";"), "-map", "[out]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-threads", "1", "-r", "25", "-movflags", "+faststart", out];
}
async function ffmpegPath() {
  if (process.env.PORT67_FFMPEG_PATH) return process.env.PORT67_FFMPEG_PATH;
  try { return (await import("@ffmpeg-installer/ffmpeg")).default.path; } catch { throw new Error("Video encoder is not installed"); }
}
async function rasterise(svg: string, size: number) {
  const { Resvg } = await import("@resvg/resvg-js");
  const font = join(process.cwd(), "node_modules", "dejavu-fonts-ttf", "ttf");
  return new Resvg(svg, { fitTo: { mode: "width", value: size }, font: { fontFiles: [join(font, "DejaVuSans.ttf"), join(font, "DejaVuSans-Bold.ttf")], loadSystemFonts: false, defaultFontFamily: "DejaVu Sans" } }).render().asPng();
}
let rendering = false;
/** One render at a time: the web service is small, and a second concurrent encode could exhaust its memory. */
export async function renderVideo(p: Project, s: Strategy, run: Runner = runFile, size: VideoSize = VIDEO_SIZE): Promise<Buffer> {
  if (!VIDEO_SIZES.includes(size)) throw new Error("Unsupported video size");
  if (rendering) throw new Error("Another video is rendering; try again in a minute");
  rendering = true;
  const dir = await mkdtemp(join(tmpdir(), "port67-video-"));
  try {
    const frames: string[] = [];
    for (const [i, scene] of videoScenes(p, s).entries()) {
      const file = join(dir, `scene${i}.png`);
      await writeFile(file, await rasterise(sceneSvg(p, scene, i, size), size));
      frames.push(file);
    }
    const out = join(dir, "out.mp4");
    await run(await ffmpegPath(), encoderArgs(frames, out));
    const bytes = await readFile(out);
    if (bytes.length < 1000) throw new Error("Video encoder produced no output");
    return bytes;
  } finally {
    rendering = false;
    await rm(dir, { recursive: true, force: true });
  }
}
