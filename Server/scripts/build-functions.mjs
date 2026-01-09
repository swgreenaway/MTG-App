import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(scriptDir, '..');
const srcRoot = path.join(serverRoot, 'src');

const copyDirectory = async (source, destination) => {
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
};

const stageFunctions = async () => {
  const functionsRoot = path.join(srcRoot, 'functions');
  const entries = await readdir(functionsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const source = path.join(functionsRoot, entry.name);
    const destination = path.join(serverRoot, entry.name);
    await copyDirectory(source, destination);
  }
};

const stageSupportCode = async () => {
  const supportDirs = ['controllers', 'services', 'db'];

  for (const dir of supportDirs) {
    const source = path.join(srcRoot, dir);
    try {
      const sourceStats = await stat(source);
      if (!sourceStats.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    const destination = path.join(serverRoot, dir);
    await copyDirectory(source, destination);
  }
};

const main = async () => {
  await stageFunctions();
  await stageSupportCode();
};

await main();
