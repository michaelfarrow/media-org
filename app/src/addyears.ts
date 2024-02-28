import path from 'path';
import fs from 'fs-extra';
import { getDirs } from '@/lib/fs';
import { MUSIC_LOSSESS_FINAL_DIR, RELEASE_FILE } from '@/lib/config';
import {
  Release,
  releasePath,
  trackFileName,
  getReleaseFiles,
} from '@/lib/namer';

async function main() {
  const artists = await getDirs(MUSIC_LOSSESS_FINAL_DIR);
  for (const artist of artists) {
    const albums = await getDirs(artist.path);
    for (const album of albums) {
      const src = album.path;
      const releaseFile = path.resolve(src, RELEASE_FILE);

      if (!(await fs.exists(releaseFile)))
        throw new Error(`Release file does not exist: ${releaseFile}`);

      const release = Release.parse(await fs.readJson(releaseFile));
      const releaseDest = path.resolve(
        MUSIC_LOSSESS_FINAL_DIR,
        releasePath(release)
      );

      if (src !== releaseDest) {
        console.log('Renaming', src, '>', releaseDest);
        fs.rename(src, releaseDest);
      }

      const discs = release.discs;
      const files = (await getReleaseFiles(src, ['m4a'])) || [];

      for (var discNumber = 0; discNumber < discs.length; discNumber++) {
        const disc = discs[discNumber];

        for (var trackNumber = 0; trackNumber < disc.length; trackNumber++) {
          const file = files[discNumber]?.files[trackNumber];

          if (!file) {
            throw new Error(`Cannot find file ${discNumber}${trackNumber}`);
          }

          const trackDest = path.resolve(
            releaseDest,
            `${trackFileName(release, discNumber, trackNumber)}.m4a`
          );

          if (file.path !== trackDest) {
            console.log('Renaming', file.path, '>', trackDest);
            fs.rename(file.path, trackDest);
          }
        }
      }
    }
  }
}

main();
