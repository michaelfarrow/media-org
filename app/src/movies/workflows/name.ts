import fs from 'fs-extra';
import path from 'path';
import { MovieDb, ExternalId, type MovieResult } from 'moviedb-promise';
import promiseRetry from 'promise-retry';
import { MOVIES_DIR, BACKDROP_FILE, POSTER_FILE } from '@/lib/config';
import { getFileTypes, downloadImage } from '@/lib/fs';
import { input, confirm } from '@/lib/ui';
import { runFfmpegCommand, probeMediaFile, type FfmpegArg } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';
import { itemName } from '@/lib/namer';

const FILE_TYPES = ['mp4', 'avi', 'mkv'];
const TM_DB_KEY = '4219e299c89411838049ab0dab19ebd5';
const IMAGE_PREFIX = 'https://image.tmdb.org/t/p/original';

const moviedb = new MovieDb(TM_DB_KEY);

async function saveArt(src: string, dest: string) {
  console.log('SAVE', src, dest);
  return await promiseRetry((retry, number) => {
    if (number !== 1) console.log('Trying again');
    return downloadImage(src, dest, 85).catch(retry);
  });
}

async function getFile(src: string) {
  const stat = await fs.stat(src);

  if (stat.isDirectory()) {
    const files = await getFileTypes(src, FILE_TYPES);

    if (!files.length)
      throw new Error(`Could not find any valid video files in ${src}`);

    if (files.length > 1) {
      console.log('Found multiple files, please choose one:');
      for (let i = 0; i < files.length; i++) {
        console.log(`${i}: ${files[i].name}`);
      }
      const chosen = Number(await input('#'));

      const file: string | undefined = files[chosen]?.path;
      if (!file) throw new Error('No file chosen');

      return file;
    }

    return files[0].path;
  }

  if (!FILE_TYPES.includes(path.parse(src).ext.replace(/^\./, '')))
    throw new Error(
      `Invalid file type: ${src}, allowed: ${FILE_TYPES.join(', ')}`
    );

  return src;
}

async function selectStream(
  name: 'video' | 'audio' | 'subtitle',
  streams: ffmpeg.FfprobeStream[]
) {
  if (!streams || !streams.length) return Promise.resolve(null);

  if (streams.length === 1 && name !== 'subtitle') return 0;

  console.log(
    `Select ${name} stream:\n${streams
      .map(
        (s, i) =>
          `${i} - ${s.codec_long_name} (${s.tags?.language}${
            s.tags?.title ? ` - ${s.tags?.title}` : ''
          })`
      )
      .join('\n')}`
  );

  const r = await input('#');

  return r === '' ? null : Number(r);
}

async function chooseStreams(src: string) {
  const data = await probeMediaFile(src);

  const videoStreams = data.streams.filter((s) => s.codec_type === 'video');
  const audioStreams = data.streams.filter((s) => s.codec_type === 'audio');
  const subtitleStreams = data.streams.filter(
    (s) => s.codec_type === 'subtitle'
  );

  const video = await selectStream('video', videoStreams);
  const audio = await selectStream('audio', audioStreams);
  const sub = await selectStream('subtitle', subtitleStreams);

  return { video, audio, sub };
}

export async function lookupData(id: string) {
  const data = await promiseRetry((retry, number) => {
    if (number !== 1) console.log('Trying again');
    return moviedb
      .find(
        {
          id,
          language: 'en-US',
          external_source: ExternalId.ImdbId,
        },
        { timeout: 10000 }
      )
      .catch(retry);
  });

  const movie: MovieResult | undefined = data.movie_results?.[0];

  if (!movie) return null;

  const poster = movie.poster_path;
  const backdrop = movie.backdrop_path;
  const title = movie.title;
  const year = movie.release_date?.match(/^\d{4}/)?.[0];

  return {
    title,
    year,
    poster: (poster && `${IMAGE_PREFIX}${poster}`) || undefined,
    backdrop: (backdrop && `${IMAGE_PREFIX}${backdrop}`) || undefined,
  };
}

export default async function name(src: string, id: string) {
  const _id = id.toLowerCase().trim();
  const file = await getFile(src);

  const data = await lookupData(_id);

  if (!data && !(await confirm('Data could not be found, continue?')))
    return false;

  let { title, year, poster, backdrop } = data || {};

  if (!title) title = (await input('Title:')).trim();
  if (!year) year = (await input('Year:')).trim();

  if (!title) throw new Error('No title specified');
  if (!year) throw new Error('No release year specified');

  if (!poster && !(await confirm('Poster image could not be found, continue?')))
    if (
      !backdrop &&
      (await confirm('Backdrop image could not be found, continue?'))
    )
      return false;

  const streams = await chooseStreams(file);

  if (streams.video === null) throw new Error('No video stream');
  if (streams.audio === null) throw new Error('No audio stream');

  const streamMapping: FfmpegArg[] = [
    ['-map', `0:v:${streams.video}`],
    ['-map', `0:a:${streams.audio}`],
  ];

  if (streams.sub !== null) streamMapping.push(['-map', `0:s:${streams.sub}`]);

  const name = `${title} (${year}) {imdb-${_id}}`;
  const ext = path.parse(file).ext;

  const dest = path.resolve(MOVIES_DIR, itemName(name, true));
  const sameSrcDest = path.resolve(src) === dest;

  if (await fs.exists(dest)) {
    if (
      !sameSrcDest &&
      !(await confirm(`Destination already exists (${dest}), erase/overwrite?`))
    ) {
      return false;
    }
    !sameSrcDest && (await fs.remove(dest));
  }

  await fs.ensureDir(dest);

  if (poster) await saveArt(poster, path.resolve(dest, POSTER_FILE));
  if (backdrop) await saveArt(backdrop, path.resolve(dest, BACKDROP_FILE));

  return runFfmpegCommand(
    ffmpeg(file).output(path.resolve(dest, `${itemName(name)}${ext}`)),
    [
      ...streamMapping,
      ['-map_metadata', '-1'],
      ['-c', 'copy'],
      ['-metadata:s:v:0', `title=`],
    ]
  );
}
