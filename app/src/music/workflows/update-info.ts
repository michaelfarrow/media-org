import processArtists from './shared/process-artists';
import processReleases from './shared/process-releases';
import { outputInfoFile } from './shared/process-update';

export default async function updateInfo(src: string) {
  const artists = await processArtists(src);

  for (const { artist } of artists) {
    const releases = await processReleases(artist.path);

    for (const { release, info } of releases) {
      if (!info) continue;
      await outputInfoFile(
        {
          id: info.id,
          artistId: info.artistId,
          groupId: info.groupId,
          title: info.title,
          disambiguation: info.disambiguation,
          artist: info.artist,
          year: info.year,
          discs: info.discs,
        },
        release
      );
    }
  }
}
