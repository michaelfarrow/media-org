import processUpdate from './shared/process-update';
import compress from './compress';
import path from 'path';
import fs from 'fs-extra';
import { RELEASE_FILE } from '@/lib/config';
import { Release } from '@/lib/namer';
import { confirm } from '@/lib/ui';

// Warn if anything is to be overriden
// Move / rename items if required

export default async function update(
  src: string,
  destLossless: string
  // destCompressed: string
) {
  const releaseFile = path.resolve(src, RELEASE_FILE);
  const releaseExisting = Release.parse(await fs.readJson(releaseFile));

  if (!(await fs.exists(releaseFile)))
    throw new Error(`Release file does not exist: ${releaseFile}`);

  const releaseRes = await processUpdate(src, destLossless, {
    mbId: releaseExisting.id,
    releaseExts: ['m4a'],
    async processTrack(track, dest) {
      if (track.path !== dest) {
        console.log(`Moving ${track.path} to ${dest}`);
        await fs.move(track.path, dest);
      }
      return true;
    },
    async postProcess(dest) {
      const srcDir = path.resolve(src);
      if (srcDir !== dest) {
        if (await confirm('Remove old source directory?'))
          await fs.remove(srcDir);
      }
    },
  });

  return releaseRes;

  // if (releaseRes) return await compress(src, destCompressed);
}
