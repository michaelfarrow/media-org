import path from 'path';
import fs from 'fs-extra';
import { getDirs } from '@/lib/fs';
import { MUSIC_LOSSESS_FINAL_DIR, RELEASE_FILE } from './lib/config';
import { Release, releasePath } from './lib/namer';

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
      const dest = path.resolve(MUSIC_LOSSESS_FINAL_DIR, releasePath(release));

      if (src !== dest) {
        console.log('Renaming', src, '>', dest);
        fs.rename(src, dest);
      }
    }
  }
}

main();
