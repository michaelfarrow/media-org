import path from 'path';
import fs from 'fs-extra';
import { type Item, getDirs } from '@/lib/fs';
import { RELEASE_FILE } from '@/lib/config';
import { Release, getReleaseFiles } from '@/lib/namer';
import { MakeOptional } from '@/lib/types';

type ProcessReleaseData = {
  artist: Item;
  release: Item;
  info: Release;
  files: NonNullable<Awaited<ReturnType<typeof getReleaseFiles>>>;
};

export interface Options {
  processReleaseRaw?: (
    data: MakeOptional<ProcessReleaseData, 'info'>
  ) => Promise<void>;
  processRelease?: (data: ProcessReleaseData) => Promise<void>;
}

export default async function processReleases(
  artist: Item,
  options: Options = {}
) {
  const { processReleaseRaw, processRelease } = options;

  const releases = await getDirs(artist.path);

  for (const release of releases) {
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

  return true;
}
