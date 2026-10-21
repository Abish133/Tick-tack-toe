/**
 * Build genuine, seamlessly looping cosmetic GIFs and animated WebP assets.
 *
 * Usage: node scripts/build-dominion-motion.mjs [--only avatar|arena|crest|banner]
 *        [--input-dir path] [--output-dir path]
 *
 * The four input PNGs are original generated artwork. This offline encoder keeps
 * that artwork intact, adding only deterministic decorative light/particle layers.
 * Nothing here runs in the game server or changes the source PNGs.
 * Requires sharp (already provided by the local Next.js development install).
 */
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
  return args[index + 1];
}
const inputDirectory = path.resolve(repository, option("--input-dir", "public/assets/collection/dominion"));
const outputDirectory = path.resolve(repository, option("--output-dir", "public/assets/collection/dominion"));
const only = option("--only", "all");
if (!["all", "avatar", "arena", "crest", "banner"].includes(only)) throw new Error("--only must be avatar, arena, crest, or banner");
const FRAME_COUNT = 32;
const FRAME_DELAY = 90;
const DURATION = FRAME_COUNT * FRAME_DELAY;
const TAU = Math.PI * 2;
const designs = [
  { name: "avatar", width: 512, height: 512, gifWidth: 384, gifHeight: 384, transparent: true },
  { name: "arena", width: 768, height: 432, gifWidth: 512, gifHeight: 288, transparent: false },
  { name: "crest", width: 512, height: 512, gifWidth: 384, gifHeight: 384, transparent: true },
  { name: "banner", width: 960, height: 320, gifWidth: 720, gifHeight: 240, transparent: false },
];
const number = (value) => Number(value.toFixed(3));
const svg = (width, height, content, definitions = "") => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${definitions}</defs>${content}</svg>`
);

function star(x, y, radius, opacity, colour = "#ffeac1") {
  const r = number(radius), short = number(radius * 0.22);
  return `<g transform="translate(${number(x)} ${number(y)})" opacity="${number(opacity)}"><path d="M0 -${r} L${short} -${short} L${r} 0 L${short} ${short} L0 ${r} L-${short} ${short} L-${r} 0 L-${short} -${short} Z" fill="${colour}"/><circle r="${number(radius * 0.16)}" fill="#fff"/></g>`;
}

function lightLayers(design, index) {
  const { width: w, height: h, transparent } = design;
  const phase = TAU * index / FRAME_COUNT;
  // Every animation is an integer-frequency sine/cosine; the loop has no reset.
  const breath = (1 - Math.cos(phase)) / 2;
  let back;
  let front = "";
  if (transparent) {
    // Keep the broad halo still: generated hair/crystal alpha is intentionally
    // delicate, and changing a layer beneath it would alter every art pixel.
    // The narrow orbital ring and stars carry the breathing light instead.
    const glow = 0.30;
    back = svg(w, h,
      `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.48}" ry="${h * 0.48}" fill="url(#halo)" opacity="${number(glow)}"/>`,
      `<radialGradient id="halo"><stop stop-color="#e9c3ff" stop-opacity=".1"/><stop offset=".55" stop-color="#8e63ff" stop-opacity=".2"/><stop offset=".78" stop-color="#ffdc93" stop-opacity=".52"/><stop offset="1" stop-color="#8054fd" stop-opacity="0"/></radialGradient>`
    );
    const rx = w * 0.395, ry = h * 0.408;
    front += `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${number(rx)}" ry="${number(ry)}" fill="none" stroke="url(#orbit)" stroke-width="${number(w * 0.0018)}" opacity=".30" transform="rotate(-18 ${w / 2} ${h / 2})"/>`;
    for (let orbit = 0; orbit < 3; orbit++) {
      const theta = phase + orbit * TAU / 3;
      // Keep moving stars in the crown band. Transparent animation formats can
      // then retain the detailed portrait instead of retransmitting it 40 times.
      const x = w / 2 + Math.cos(theta) * w * 0.28;
      const y = h * 0.155 + Math.sin(theta) * h * 0.055;
      const radius = w * (orbit === 0 ? 0.011 : 0.007);
      front += `<circle cx="${number(x)}" cy="${number(y)}" r="${number(radius * 2.4)}" fill="url(#spark)" opacity=".7"/>`;
      front += star(x, y, radius, orbit === 0 ? 0.92 : 0.6, orbit === 1 ? "#e2b7ff" : "#fff0bf");
    }
  } else {
    back = svg(w, h, "");
    front += `<path d="M${-w * 0.05} ${number(h * (0.24 + Math.sin(phase) * 0.025))} Q${w * 0.3} ${number(-h * 0.12 + Math.sin(phase) * h * 0.045)} ${w * 0.68} ${number(h * 0.18 + Math.cos(phase) * h * 0.06)} T${w * 1.1} ${h * 0.14}" fill="none" stroke="url(#aurora)" stroke-width="${h * 0.045}" opacity="${number(0.17 + breath * 0.12)}" filter="url(#soft)"/>`;
  }
  const sparkCount = transparent ? 10 : 18;
  for (let j = 0; j < sparkCount; j++) {
    // A fixed low-discrepancy constellation, not random flicker between frames.
    const xSeed = ((j * 0.61803398875 + 0.13) % 1);
    const ySeed = ((j * 0.38196601125 + 0.11) % 1);
    let x = w * (0.07 + xSeed * 0.86);
    let y = h * (0.08 + ySeed * (transparent ? 0.84 : 0.63));
    if (transparent && x > w * 0.33 && x < w * 0.67 && y > h * 0.23 && y < h * 0.71) x = w * (j % 2 ? 0.8 : 0.2);
    const alive = !transparent || y < h * 0.30;
    if (alive) y += Math.sin(phase + j * 0.79) * h * 0.009;
    const twinkle = alive ? Math.pow((1 + Math.sin(phase * 2 + j * 1.43)) / 2, 3) : 0.2;
    front += star(x, y, w * (0.0035 + (j % 3) * 0.0015), 0.10 + twinkle * 0.72, j % 2 ? "#d7c7ff" : "#fff0c8");
  }
  const definitions = `<linearGradient id="orbit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#bba4ff"/><stop offset=".48" stop-color="#fff0b4"/><stop offset="1" stop-color="#ffdc93"/></linearGradient><radialGradient id="spark"><stop stop-color="#fff9db" stop-opacity=".9"/><stop offset=".3" stop-color="#d6aaff" stop-opacity=".5"/><stop offset="1" stop-color="#a591ff" stop-opacity="0"/></radialGradient><linearGradient id="aurora"><stop stop-color="#9c73d5" stop-opacity="0"/><stop offset=".3" stop-color="#ffdc93"/><stop offset=".7" stop-color="#dc91ff"/><stop offset="1" stop-color="#fff1ba" stop-opacity="0"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="${h * 0.018}"/></filter>`;
  // The sin-driven highlight reverses gently at the edges, completing a true loop.
  const sweep = w * (0.5 + Math.sin(phase - Math.PI / 2) * 0.75);
  const shimmer = svg(w, h,
    `<path d="M${number(sweep - w * 0.18)} 0 L${number(sweep + w * 0.02)} 0 L${number(sweep + w * 0.32)} ${h} L${number(sweep + w * 0.12)} ${h} Z" fill="url(#sheen)" opacity="${transparent ? 0.13 : 0.045}"/>`,
    `<linearGradient id="sheen"><stop stop-color="#ffdc93" stop-opacity="0"/><stop offset=".5" stop-color="#fff9e8"/><stop offset="1" stop-color="#deb7ff" stop-opacity="0"/></linearGradient>`
  );
  return { back, front: svg(w, h, front, definitions), shimmer };
}

function animatedInput(frames, width, height) {
  return sharp(Buffer.concat(frames), { raw: { width, height: height * frames.length, channels: 4, pageHeight: height }, limitInputPixels: false });
}

async function fileMetadata(file, transparent) {
  const [metadata, details] = await Promise.all([sharp(file, { animated: true }).metadata(), stat(file)]);
  const samplePages = metadata.pages > 1 ? [0, 8, 16, 24] : [0];
  const sampleHashes = new Set();
  let transparentCorners = true;
  for (const page of samplePages) {
    const { data, info } = await sharp(file, { page, pages: 1 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    sampleHashes.add(createHash("sha256").update(data).digest("hex"));
    const corners = [0, info.width - 1, (info.height - 1) * info.width, info.width * info.height - 1];
    if (corners.some((pixel) => data[pixel * 4 + 3] !== 0)) transparentCorners = false;
  }
  if (metadata.pages > 1 && sampleHashes.size < 3) throw new Error(`${path.basename(file)} must visibly animate across decoded frames`);
  if (transparent && !transparentCorners) throw new Error(`${path.basename(file)} lost its transparent corner pixels`);
  return {
    file: path.basename(file), width: metadata.width, height: metadata.pageHeight || metadata.height,
    frames: metadata.pages || 1, durationMs: (metadata.delay || []).reduce((sum, delay) => sum + delay, 0),
    loop: metadata.loop, hasAlpha: metadata.hasAlpha, bytes: details.size,
    sha256: createHash("sha256").update(await readFile(file)).digest("hex"),
    distinctDecodedSampleFrames: sampleHashes.size, ...(transparent ? { transparentCorners } : {}),
  };
}

async function build(design) {
  const { name, width, height, gifWidth, gifHeight, transparent } = design;
  const source = path.join(inputDirectory, `${name}.png`);
  const sourceBuffer = await readFile(source);
  const sourceMetadata = await sharp(sourceBuffer).metadata();
  if (transparent && !sourceMetadata.hasAlpha) throw new Error(`${name}.png must have a transparent alpha channel`);
  if (transparent && (await sharp(sourceBuffer).stats()).channels[3].min !== 0) throw new Error(`${name}.png must include fully transparent pixels`);
  const padding = transparent ? 0.90 : 1;
  const fitted = await sharp(sourceBuffer).resize(Math.round(width * padding), Math.round(height * padding), {
    fit: "contain", background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : "#080b1e",
  }).png().toBuffer();
  const base = await sharp({ create: { width, height, channels: 4, background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : "#080b1e" } })
    .composite([{ input: fitted, gravity: "centre" }]).png().toBuffer();
  const frames = [], gifFrames = [], frameDigests = new Set();
  for (let i = 0; i < FRAME_COUNT; i++) {
    const layers = lightLayers(design, i);
    // Icon art remains byte-identical between frames: avoiding a full-art colour
    // sweep keeps intricate transparent edges sharp and permits delta encoding.
    const sheen = transparent ? null : await sharp(layers.shimmer).composite([{ input: base, blend: "dest-in" }]).png().toBuffer();
    const frame = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: transparent ? 0 : 1 } } })
      .composite([{ input: layers.back }, { input: base }, ...(sheen ? [{ input: sheen, blend: "screen" }] : []), { input: layers.front }]).ensureAlpha().raw().toBuffer();
    frames.push(frame);
    frameDigests.add(createHash("sha256").update(frame).digest("hex"));
    gifFrames.push(await sharp(frame, { raw: { width, height, channels: 4 } }).resize(gifWidth, gifHeight).raw().toBuffer());
    if ((i + 1) % 10 === 0) console.log(`${name}: rendered ${i + 1}/${FRAME_COUNT} frames.`);
  }
  if (frameDigests.size !== FRAME_COUNT) throw new Error(`${name}: animation did not produce ${FRAME_COUNT} unique frames`);
  console.log(`${name}: rendered ${FRAME_COUNT} unique frames; encoding WebP and GIF.`);
  const webpFile = path.join(outputDirectory, `${name}.webp`);
  const gifFile = path.join(outputDirectory, `${name}.gif`);
  const posterFile = path.join(outputDirectory, `${name}-poster.webp`);
  await sharp(frames[0], { raw: { width, height, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toFile(posterFile);
  const delays = Array(FRAME_COUNT).fill(FRAME_DELAY);
  await animatedInput(frames, width, height).webp({ quality: 82, alphaQuality: 100, effort: 4, loop: 0, delay: delays }).toFile(webpFile);
  console.log(`${name}: WebP encoded; encoding GIF.`);
  await animatedInput(gifFrames, gifWidth, gifHeight).gif({ colours: 192, dither: 0.2, effort: 7, loop: 0, delay: delays, interFrameMaxError: 3, interPaletteMaxError: 256, keepDuplicateFrames: true }).toFile(gifFile);
  const outputs = await Promise.all([webpFile, gifFile, posterFile].map((file) => fileMetadata(file, transparent)));
  for (const output of outputs.slice(0, 2)) {
    if (output.frames !== FRAME_COUNT || output.durationMs !== DURATION || output.loop !== 0) throw new Error(`${output.file}: invalid animation metadata ${JSON.stringify(output)}`);
  }
  console.log(JSON.stringify({ name, uniqueSourceFrames: frameDigests.size, outputs }));
  return { name, source: `${name}.png`, sourceSha256: createHash("sha256").update(sourceBuffer).digest("hex"), uniqueSourceFrames: frameDigests.size, outputs };
}

await mkdir(outputDirectory, { recursive: true });
const manifest = {
  formatVersion: 1, encoder: `sharp ${sharp.versions.sharp} / libvips ${sharp.versions.vips}`,
  frameCount: FRAME_COUNT, frameDelayMs: FRAME_DELAY, durationMs: DURATION, loop: "infinite",
  artTreatment: "Original artwork stays still; decorative light, orbital stars, and shimmer loop above it.",
  reducedMotion: "Use each -poster.webp when reduced motion is requested or user animation is disabled.",
  assets: [],
};
for (const design of designs.filter((design) => only === "all" || design.name === only)) manifest.assets.push(await build(design));
await writeFile(path.join(outputDirectory, only === "all" ? "motion-manifest.json" : `${only}.motion-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
