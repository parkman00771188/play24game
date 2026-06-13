import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = process.cwd();
const writeChanges = process.argv.includes("--write");
const assetReferencePattern = /(?<prefix>["'(])(?<asset>\.?\/?assets\/[^"'()]+\.(?:png|jpe?g|webp))(?<suffix>["')])/gi;
const textExtensions = new Set([".html", ".css", ".js"]);
const sourceExtensions = [".png", ".jpg", ".jpeg"];

function normalizeAssetPath(assetPath) {
  return assetPath.replace(/^\.\//, "").replace(/^\//, "");
}

function optimizedAssetPath(assetPath) {
  const normalized = normalizeAssetPath(assetPath);
  const parsed = path.parse(normalized);
  return path.posix.join("assets", "optimized", path.posix.relative("assets", parsed.dir), `${parsed.name}.webp`);
}

async function existingSourceForOptimizedReference(assetPath) {
  const relative = path.posix.relative("assets/optimized", assetPath);
  const parsed = path.posix.parse(relative);
  const sourceBase = path.posix.join("assets", parsed.dir, parsed.name);

  for (const extension of sourceExtensions) {
    const candidate = `${sourceBase}${extension}`;
    try {
      await fs.access(path.join(rootDir, candidate));
      return candidate;
    } catch {
      // Try the next common raster source extension.
    }
  }

  return null;
}

async function sourceAssetForReference(assetPath) {
  const normalized = normalizeAssetPath(assetPath);
  const extension = path.extname(normalized).toLowerCase();

  if (normalized.startsWith("assets/optimized/") && extension === ".webp") {
    return existingSourceForOptimizedReference(normalized);
  }

  if (sourceExtensions.includes(extension)) {
    return normalized;
  }

  return null;
}

function formatAssetPath(originalPath, optimizedPath) {
  if (originalPath.startsWith("/")) return `/${optimizedPath}`;
  if (originalPath.startsWith("./")) return `./${optimizedPath}`;
  return optimizedPath;
}

function maxDimensionFor(assetPath) {
  if (assetPath.endsWith("assets/logo.png")) return 640;
  if (assetPath.includes("/character/transparent/")) return 256;
  if (assetPath.endsWith("assets/mascot.png")) return 560;
  if (assetPath.includes("/medal/transparent/")) return 240;
  if (assetPath.includes("/ranking/mascot-trophy")) return 260;
  if (assetPath.includes("/ranking/medal-")) return 160;
  if (assetPath.includes("/ranking/verify")) return 64;
  if (assetPath.includes("/tilemapImage/extracted/")) return 220;
  return 640;
}

function isNearWhiteBackground(data, index) {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const brightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  return red > 190 && green > 190 && blue > 190 && brightest - darkest < 46;
}

async function edgeTransparentLogoPipeline(absoluteSource) {
  const { data, info } = await sharp(absoluteSource, { animated: false })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const transparent = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (transparent[pixel]) return;
    const index = pixel * channels;
    if (!isNearWhiteBackground(data, index)) return;
    transparent[pixel] = 1;
    queue.push(pixel);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;

  for (let pixel = 0; pixel < transparent.length; pixel += 1) {
    if (transparent[pixel]) {
      data[pixel * channels + 3] = 0;
      continue;
    }

    const alpha = data[pixel * channels + 3];
    if (alpha === 0) continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  const padding = 18;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  return sharp(data, { raw: { width, height, channels } }).extract({
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "assets") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectReferences(files) {
  const references = new Map();
  const pendingUpdates = [];

  for (const file of files) {
    const original = await fs.readFile(file, "utf8");
    let updated = original;
    const matches = [...original.matchAll(assetReferencePattern)];

    for (const match of matches) {
      const referencedPath = match.groups.asset;
      const sourcePath = await sourceAssetForReference(referencedPath);
      if (!sourcePath) continue;

      const absoluteSource = path.join(rootDir, sourcePath);
      try {
        await fs.access(absoluteSource);
      } catch {
        continue;
      }

      const optimized = optimizedAssetPath(sourcePath);
      references.set(sourcePath, optimized);

      if (!normalizeAssetPath(referencedPath).startsWith("assets/optimized/")) {
        const replacement = formatAssetPath(referencedPath, optimized);
        updated = updated.split(referencedPath).join(replacement);
      }
    }

    if (updated !== original) {
      pendingUpdates.push({ file, updated });
    }
  }

  return { references, pendingUpdates };
}

async function optimizeImage(sourcePath, optimizedPath) {
  const absoluteSource = path.join(rootDir, sourcePath);
  const absoluteOutput = path.join(rootDir, optimizedPath);
  const outputDir = path.dirname(absoluteOutput);
  await fs.mkdir(outputDir, { recursive: true });

  const image = sourcePath.endsWith("assets/logo.png")
    ? await edgeTransparentLogoPipeline(absoluteSource)
    : sharp(absoluteSource, { animated: false }).rotate();
  const metadata = await image.metadata();
  const maxDimension = maxDimensionFor(sourcePath);
  const needsResize = Math.max(metadata.width || 0, metadata.height || 0) > maxDimension;

  let pipeline = image;
  if (needsResize) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  await pipeline
    .webp({
      quality: 82,
      alphaQuality: 86,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(absoluteOutput);

  const sourceStat = await fs.stat(absoluteSource);
  const outputStat = await fs.stat(absoluteOutput);
  return {
    sourcePath,
    optimizedPath,
    sourceSize: sourceStat.size,
    outputSize: outputStat.size,
    width: metadata.width,
    height: metadata.height,
    maxDimension,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const textFiles = await walk(rootDir);
const { references, pendingUpdates } = await collectReferences(textFiles);
const optimized = [];

for (const [sourcePath, outputPath] of references) {
  optimized.push(await optimizeImage(sourcePath, outputPath));
}

if (writeChanges) {
  for (const update of pendingUpdates) {
    await fs.writeFile(update.file, update.updated);
  }
}

const totals = optimized.reduce(
  (sum, item) => ({
    sourceSize: sum.sourceSize + item.sourceSize,
    outputSize: sum.outputSize + item.outputSize,
  }),
  { sourceSize: 0, outputSize: 0 }
);

console.log(`Optimized ${optimized.length} referenced images.`);
console.log(`Original referenced bytes: ${formatBytes(totals.sourceSize)}`);
console.log(`Optimized bytes: ${formatBytes(totals.outputSize)}`);
console.log(`Reference updates: ${writeChanges ? pendingUpdates.length : 0} files${writeChanges ? "" : " (dry run)"}`);

for (const item of optimized.sort((a, b) => b.sourceSize - a.sourceSize).slice(0, 20)) {
  console.log(`${item.sourcePath} -> ${item.optimizedPath} (${formatBytes(item.sourceSize)} -> ${formatBytes(item.outputSize)})`);
}
