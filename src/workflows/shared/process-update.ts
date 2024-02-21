import path from 'path';
import fs from 'fs-extra';
import { type File } from '@/lib/fs';
import {
  releasePath,
  trackFileName,
  getReleaseFiles,
  getMbData,
  compareFiles,
  logTracks,
  logDiscs,
} from '@/lib/namer';

import { confirm } from '@/lib/ui';

export type Options = {
  mbId: string;
  processTrack: (track: File, dest: string) => Promise<boolean>;
  postProcess?: (dest: string) => Promise<void>;
  releaseExts?: string[];
};

export default async function processUpdate(
  src: string,
  dest: string,
  options: Options
) {
  const { mbId, releaseExts, processTrack, postProcess } = options;

  const files = await getReleaseFiles(src, releaseExts);
  const release = await getMbData(mbId);

  if (files && release) {
    const similarity = compareFiles(files, release);

    if (similarity === false) throw new Error('Track count does not match');
    if (similarity !== true) {
      console.log('Tracks do not look alike');
      console.log('');
      console.log('Similarity:');
      console.log(
        similarity.map((disc) => disc.map((s, i) => `${i + 1} - ${s}`))
      );
      logTracks(files);
      logDiscs(release.discs);
      if (!(await confirm('Continue?'))) return false;
    }

    const srcDest = path.resolve(src);
    const releaseDest = path.resolve(dest, releasePath(release));

    const sameSrcDest = srcDest === releaseDest;

    if (await fs.exists(releaseDest)) {
      if (
        !sameSrcDest &&
        !(await confirm(
          `Destination already exists (${releaseDest}), erase/overwrite?`
        ))
      ) {
        return false;
      }
      !sameSrcDest && (await fs.remove(releaseDest));
    }

    await fs.ensureDir(releaseDest);

    for (var groupNumber = 0; groupNumber < files.length; groupNumber++) {
      const group = files[groupNumber];

      for (var fileNumber = 0; fileNumber < group.files.length; fileNumber++) {
        const track = group.files[fileNumber];

        const trackDest = path.resolve(
          releaseDest,
          `${trackFileName(release, groupNumber, fileNumber)}.m4a`
        );

        await processTrack(track, trackDest);
      }
    }

    await fs.writeJSON(path.resolve(releaseDest, 'release.json'), release, {
      spaces: 2,
    });

    postProcess && (await postProcess(releaseDest));
  }

  return true;
}
