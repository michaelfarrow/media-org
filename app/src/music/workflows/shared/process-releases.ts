import { getDirs } from '@/lib/fs';

import processRelease from './process-release';

export default async function processReleases(artist: string) {
  const releases = await getDirs(artist);

  const _releases: ({ artist: string } & Awaited<
    ReturnType<typeof processRelease>
  >)[] = [];

  for (const release of releases) {
    _releases.push({ artist, ...(await processRelease(release.path)) });
  }

  return _releases;
}
