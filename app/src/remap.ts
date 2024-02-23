import path from 'path';
import fs from 'fs-extra';
import { getDirs } from '@/lib/fs';
import processRaw from '@/workflows/process-raw';
import { MUSIC_LOSSESS_NEW_DIR, MUSIC_LOSSESS_FINAL_DIR } from './lib/config';

const SRC = MUSIC_LOSSESS_NEW_DIR;
const DEST = MUSIC_LOSSESS_FINAL_DIR;

const DONE_FILE = 'done';

async function main() {
  await fs.ensureDir(DEST);

  const dirs = await getDirs(SRC, {
    depth: 1,
    filter: (item) => {
      const withoutPrefix = item.path.startsWith(SRC)
        ? item.path.substring(SRC.length + 1)
        : item.path;
      return withoutPrefix.split('/').length == 2;
    },
  });

  for (const dir of dirs) {
    const donePath = path.resolve(dir.path, DONE_FILE);

    if (await fs.exists(donePath)) continue;

    const mbidPath = path.resolve(dir.path, 'mbid');
    if (!(await fs.exists(mbidPath)))
      throw new Error(`Could not find mbid file: ${mbidPath}`);

    const mbid = (await fs.readFile(mbidPath, 'utf-8')).trim();
    if (!mbid) throw new Error('Could not read mbid file');

    console.log();
    console.log('Processing', dir.path);

    if (await processRaw(dir.path, DEST, mbid, true)) {
      await fs.ensureFile(donePath);
    }
  }
}

main();
