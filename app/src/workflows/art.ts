import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import sharp from 'sharp';
import {
  MUSIC_LOSSESS_DIR,
  MUSIC_COMPRESSED_DIR,
  RELEASE_FILE,
  ARTIST_FILE,
} from '@/lib/config';
import { getDirs } from '@/lib/fs';
import { Release } from '@/lib/namer';

const AUDIO_DB_KEY = '195003';

const JSON_OPTIONS = {
  headers: {
    'Content-Type': 'application/json; charset=shift-jis',
    'Access-Control-Allow-Origin': '*',
    'accept-encoding': null,
    proxy: false,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    gzip: true,
    encoding: null,
  },
};

const audioDb = axios.create({
  baseURL: `https://www.theaudiodb.com/api/v1/json/${AUDIO_DB_KEY}`,
});

async function getArtMethod(method: string): Promise<{
  primary: string | null;
  banner: string | null;
  backdrop: string[];
} | null> {
  return new Promise((resolve, reject) => {
    audioDb
      .get(method, JSON_OPTIONS)
      .then((res) => {
        const artist: { [key: string]: string } | undefined =
          res.data?.artists?.[0];

        if (!artist) resolve(null);

        const data = artist
          ? {
              primary: artist.strArtistThumb || null,
              banner: artist.strArtistBanner || null,
              backdrop: [
                artist.strArtistFanart || null,
                artist.strArtistFanart2 || null,
                artist.strArtistFanart3 || null,
                artist.strArtistFanart4 || null,
              ].filter((i): i is string => i !== null),
            }
          : null;

        setTimeout(() => resolve(data), 1000);
      })
      .catch((e) => reject(e));
  });
}

async function getArt(artist: string, id?: string) {
  let data: Awaited<ReturnType<typeof getArtMethod>> = null;

  if (id)
    data = await getArtMethod(`artist-mb.php?i=${encodeURIComponent(id)}`);
  if (!data)
    data = await getArtMethod(`search.php?s=${encodeURIComponent(artist)}`);

  return data;
}

async function saveArt(src: string, dest: string) {
  console.log('SAVE', src, dest);
  const input = (await axios({ url: src, responseType: 'arraybuffer' })).data;
  await sharp(input).jpeg({ quality: 100 }).toFile(dest);
}

export default async function art() {
  const artists = await getDirs(MUSIC_COMPRESSED_DIR);

  for (const artist of artists) {
    const artistArtPath = path.resolve(artist.path, ARTIST_FILE);

    if (await fs.exists(artistArtPath)) continue;

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

    const data = await getArt(artistName, artistId);

    if (data && data.primary) {
      await saveArt(data.primary, artistArtPath);
    } else {
      console.log('MISSING', artistName);
    }
  }

  return true;
}
