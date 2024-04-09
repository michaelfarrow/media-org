import integrity from './integrity';
import processArtists from './shared/process-artists';
import processReleases from './shared/process-releases';

export default async function integrityAll(src: string) {
  const artists = await processArtists(src);

  for (const { artist } of artists) {
    const releases = await processReleases(artist.path);

    for (const { release } of releases) {
      await integrity(release);
    }
  }
}
