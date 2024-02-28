import path from 'path';
import fs from 'fs-extra';
import { getDirs } from '@/lib/fs';
import {
  MUSIC_LOSSESS_FINAL_DIR,
  RELEASE_FILE,
  COVER_FILES_TO_CONVERT,
} from '@/lib/config';
import { Release, getReleaseFiles } from '@/lib/namer';

export default async function integrity() {
  const artists = await getDirs(MUSIC_LOSSESS_FINAL_DIR);
  for (const artist of artists) {
    const albums = await getDirs(artist.path);
    for (const album of albums) {
      const src = album.path;
      const releaseFile = path.resolve(src, RELEASE_FILE);

      if (!(await fs.exists(releaseFile)))
        console.log(`Release file does not exist: ${releaseFile}`);

      const coverFiles: string[] = [];
      for (const file of COVER_FILES_TO_CONVERT) {
        if (await fs.exists(path.resolve(src, file))) {
          coverFiles.push(file);
        }
      }

      if (!coverFiles.length) console.log(`Cover file not available: ${src}`);

      const release = Release.parse(await fs.readJson(releaseFile));

      const files = ((await getReleaseFiles(src)) || [])
        .map((disc) => disc.files)
        .flat();
      const tracks = release.discs.flat();

      if (files.length !== tracks.length)
        console.log(`Track length mismatch: ${src}`);
    }
  }

  return true;
}
