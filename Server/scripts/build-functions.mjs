import { promises as fs } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const distRoot = path.join(projectRoot, 'dist');
const functionsRoot = path.join(srcRoot, 'functions');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const pathExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    return false;
  }
};

const copyDirContents = async (from, to) => {
  await ensureDir(to);
  const entries = await fs.readdir(from, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => {
      const src = path.join(from, entry.name);
      const dest = path.join(to, entry.name);
      return fs.cp(src, dest, { recursive: true });
    })
  );
};

const copyDirIfExists = async (from, to) => {
  if (await pathExists(from)) {
    await fs.cp(from, to, { recursive: true });
  }
};

await fs.rm(distRoot, { recursive: true, force: true });
await ensureDir(distRoot);

await copyDirContents(functionsRoot, distRoot);
await copyDirIfExists(path.join(srcRoot, 'controllers'), path.join(distRoot, 'controllers'));
await copyDirIfExists(path.join(srcRoot, 'db'), path.join(distRoot, 'db'));
await copyDirIfExists(path.join(srcRoot, 'services'), path.join(distRoot, 'services'));

if (await pathExists(packageJsonPath)) {
  await fs.copyFile(packageJsonPath, path.join(distRoot, 'package.json'));
}

if (await pathExists(packageLockPath)) {
  await fs.copyFile(packageLockPath, path.join(distRoot, 'package-lock.json'));
}
