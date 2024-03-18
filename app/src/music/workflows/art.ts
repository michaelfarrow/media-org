import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import sharp from 'sharp';
import { type Item, downloadImage } from '@/lib/fs';
import { MUSIC_COMPRESSED_DIR, ARTIST_FILE } from '@/lib/config';

import processArtists from './shared/process-artists';

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
  return downloadImage(src, dest, 100);
}

function artistArtPath(artist: Item) {
  return path.resolve(artist.path, ARTIST_FILE);
}

export default async function art() {
  return processArtists(MUSIC_COMPRESSED_DIR, {
    async shouldProcessArtist(artist) {
      return !(await fs.exists(artistArtPath(artist)));
    },
    async processArtist({ artist, name, id }) {
      const data = await getArt(name, id);

      if (data && data.primary) {
        await saveArt(data.primary, artistArtPath(artist));
      } else {
        console.log('MISSING', name);
      }
    },
  });
}
