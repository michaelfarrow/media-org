import path from 'path';
import fs from 'fs-extra';
import { getDirs, type Item } from '@/lib/fs';
import { Release } from '@/lib/namer';
import { MUSIC_LOSSESS_DIR, RELEASE_FILE } from '@/lib/config';

export default async function processArtists(dir: string) {
  const artists = await getDirs(dir);
  const _artists: { artist: Item; name: string; id?: string }[] = [];

  for (const artist of artists) {
    let artistId: string | undefined = undefined;
    let artistName = artist.name;

    const releases = await getDirs(
      path.resolve(MUSIC_LOSSESS_DIR, artist.name)
    );

    const release = releases.length ? releases[0] : undefined;

    if (release) {
      const releaseFile = path.resolve(release.path, RELEASE_FILE);
      const info =
        ((await fs.exists(releaseFile)) &&
          Release.parse(await fs.readJson(releaseFile))) ||
        undefined;

      if (info) {
        artistName = info.artist;
        artistId = info.artistId;
      }
    }

    _artists.push({ artist, name: artistName, id: artistId });
  }

  return _artists;
}
