import compress from './compress';

import processArtists from './shared/process-artists';
import processReleases from './shared/process-releases';

export default async function compressAll(src: string, dest: string) {
  const artists = await processArtists(src);

  for (const { artist } of artists) {
    const releases = await processReleases(artist.path);

    for (const { release, info } of releases) {
      if (!info) continue;
      await compress(release, dest, {
        skipComplete: true,
      });
    }
  }
}
