import path from 'path';
import fs from 'fs-extra';
import { getDirs, Item } from '@/lib/fs';
import { Release } from '@/lib/namer';
import { MUSIC_LOSSESS_DIR, RELEASE_FILE } from '@/lib/config';

interface Options {
  shouldProcessArtist?: (item: Item) => Promise<boolean>;
  processArtist?: (data: {
    artist: Item;
    name: string;
    id?: string;
  }) => Promise<void>;
}

export default async function processArtists(
  dir: string,
  options: Options = {}
) {
  const { shouldProcessArtist, processArtist } = options;

  const artists = await getDirs(dir);

  for (const artist of artists) {
    if (shouldProcessArtist && !(await shouldProcessArtist(artist))) continue;

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

    processArtist &&
      (await processArtist({ artist, name: artistName, id: artistId }));
  }

  return true;
}
