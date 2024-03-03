import path from 'path';
import fs from 'fs-extra';
import { type Item, getDirs } from '@/lib/fs';
import { MUSIC_LOSSESS_FINAL_DIR, RELEASE_FILE } from '@/lib/config';
import { Release, getReleaseFiles } from '@/lib/namer';
import { MakeOptional } from '@/lib/types';

type ProcessReleaseData = {
  artist: Item;
  release: Item;
  info: Release;
  files: NonNullable<Awaited<ReturnType<typeof getReleaseFiles>>>;
};

export interface Options {
  processArtist?: (artist: Item) => Promise<void>;
  processReleaseRaw?: (
    data: MakeOptional<ProcessReleaseData, 'info'>
  ) => Promise<void>;
  processRelease?: (data: ProcessReleaseData) => Promise<void>;
}

export default async function processLossless(options: Options = {}) {
  const { processArtist, processReleaseRaw, processRelease } = options;

  const artists = await getDirs(MUSIC_LOSSESS_FINAL_DIR);

  console.log(artists);

  for (const artist of artists) {
    processArtist && (await processArtist(artist));

    const releases = await getDirs(artist.path);

    for (const release of releases) {
      console.log(release);
      const releaseFile = path.resolve(release.path, RELEASE_FILE);
      const info =
        ((await fs.exists(releaseFile)) &&
          Release.parse(await fs.readJson(releaseFile))) ||
        undefined;
      const files = (await getReleaseFiles(release.path)) || [];

      processReleaseRaw &&
        (await processReleaseRaw({ artist, release, info, files }));

      if (info && processRelease)
        await processRelease({ artist, release, info, files });
    }
  }

  return true;
}
