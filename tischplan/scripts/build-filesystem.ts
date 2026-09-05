import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'dist-file');
const intermediateDirectory = resolve(outputDirectory, '.vite-build');
const outputFile = resolve(outputDirectory, 'Hand-aufs-Herz.html');

function generatedAssetPath(reference: string): string {
  const normalizedReference = reference.startsWith('./') ? reference.slice(2) : reference;
  const assetPath = resolve(intermediateDirectory, normalizedReference);
  const isInsideBuild = assetPath.startsWith(`${intermediateDirectory}${sep}`);
  if (!isInsideBuild) {
    throw new Error(`Filesystem build contains an unsafe asset path: ${reference}`);
  }
  return assetPath;
}

function inlineScript(code: string): string {
  return code.replaceAll(/<\/script/gi, '<\\/script');
}

function inlineStyles(css: string): string {
  return css.replaceAll(/<\/style/gi, '<\\/style');
}

async function emittedFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return emittedFiles(entryPath);
    }
    return [relative(intermediateDirectory, entryPath)];
  }));
  return files.flat().sort();
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(intermediateDirectory, { recursive: true });

await build({
  root: projectRoot,
  configFile: resolve(projectRoot, 'vite.config.ts'),
  publicDir: false,
  base: './',
  build: {
    outDir: intermediateDirectory,
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

let html = await readFile(resolve(intermediateDirectory, 'index.html'), 'utf8');
const scriptTag = html.match(/<script\s+type="module"\s+crossorigin\s+src="([^"]+)"\s*><\/script>/);
const stylesheetTag = html.match(/<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?\s*>/);
if (!scriptTag || !stylesheetTag) {
  throw new Error('Filesystem build could not identify the generated script and stylesheet.');
}

const generatedResourceTags = [...html.matchAll(/<(?:script|link|img|source)\b[^>]+(?:src|href)="([^"]+)"[^>]*>/g)];
const inlineResourceReferences = new Set([scriptTag[1], stylesheetTag[1]]);
const unexpectedResourceTags = generatedResourceTags.filter((match) => !inlineResourceReferences.has(match[1]));
if (unexpectedResourceTags.length > 0) {
  throw new Error(`Filesystem build contains resources that were not inlined: ${unexpectedResourceTags.map((match) => match[1]).join(', ')}`);
}

const scriptPath = generatedAssetPath(scriptTag[1]);
const stylesheetPath = generatedAssetPath(stylesheetTag[1]);
const script = await readFile(scriptPath, 'utf8');
const stylesheet = await readFile(stylesheetPath, 'utf8');
html = html
  .replace(scriptTag[0], () => `<script type="module">${inlineScript(script)}</script>`)
  .replace(stylesheetTag[0], () => `<style>${inlineStyles(stylesheet)}</style>`);

const allowedFiles = new Set([
  'index.html',
  relative(intermediateDirectory, scriptPath),
  relative(intermediateDirectory, stylesheetPath),
]);
const unsupportedFiles = (await emittedFiles(intermediateDirectory)).filter((file) => !allowedFiles.has(file));
if (unsupportedFiles.length > 0) {
  throw new Error(`Filesystem build emitted assets that were not inlined: ${unsupportedFiles.join(', ')}`);
}

await writeFile(outputFile, html, 'utf8');
await rm(intermediateDirectory, { recursive: true, force: true });

console.log(`Filesystem build written to ${relative(projectRoot, outputFile)}`);
