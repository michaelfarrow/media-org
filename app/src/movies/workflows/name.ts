import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import { MovieDb, ExternalId, type MovieResult } from 'moviedb-promise';
import promiseRetry from 'promise-retry';
import {
  MOVIE_TYPES,
  MOVIE_AUDIO_TYPES,
  MOVIES_DIR,
  BACKDROP_FILE,
  POSTER_FILE,
} from '@/lib/config';
import { getFileTypes, downloadImage } from '@/lib/fs';
import { input, confirm, choices } from '@/lib/ui';
import { runFfmpegCommand, probeMediaFile, type FfmpegArg } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';
import { itemName } from '@/lib/namer';
import { getSubtitles, getSubtitleLink } from '@/lib/movies';

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
    const files = await getFileTypes(src, MOVIE_TYPES);

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

  if (!MOVIE_TYPES.includes(path.parse(src).ext.replace(/^\./, '')))
    throw new Error(
      `Invalid file type: ${src}, allowed: ${MOVIE_TYPES.join(', ')}`
    );

  return src;
}

async function selectStream(
  name: 'video' | 'audio' | 'subtitle',
  streams: ffmpeg.FfprobeStream[],
  force?: boolean
) {
  if (!streams || !streams.length) return Promise.resolve(null);

  if (streams.length === 1 && !force) return 0;

  const r = await choices(
    `Select ${name} stream`,
    streams.map((s, i) => ({
      title: [s.codec_name, s.tags?.language, s.tags?.title]
        .filter((s) => s !== undefined && s !== 'unknown')
        .join(', '),
      value: i,
    }))
  );

  return r !== undefined ? Number(r) : null;
}

async function chooseStreams(src: string) {
  const data = await probeMediaFile(src);

  const videoStreams = data.streams.filter((s) => s.codec_type === 'video');
  const audioStreams = data.streams.filter((s) => s.codec_type === 'audio');
  const subStreams = data.streams.filter((s) => s.codec_type === 'subtitle');

  const video = await selectStream('video', videoStreams);
  const audio = await selectStream('audio', audioStreams);
  // const sub = await selectStream('subtitle', subStreams);

  return {
    chapters: data.chapters,
    video:
      video !== null ? { index: video, stream: videoStreams[video] } : null,
    audio:
      audio !== null ? { index: audio, stream: audioStreams[audio] } : null,
    sub: subStreams,
    // sub: sub !== null ? { index: sub, stream: subStreams[sub] } : null,
  };
}

async function lookupData(id: string) {
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
  const language = movie.original_language;

  return {
    title,
    year,
    language,
    poster: (poster && `${IMAGE_PREFIX}${poster}`) || undefined,
    backdrop: (backdrop && `${IMAGE_PREFIX}${backdrop}`) || undefined,
  };
}

async function downloadSubtitles({
  src,
  id,
  streams,
  dest,
  name,
  language,
}: {
  src: string;
  id: string;
  streams: {
    video: ffmpeg.FfprobeStream;
    sub: ffmpeg.FfprobeStream[];
  };
  dest: string;
  name: string;
  language?: string;
}) {
  const fps =
    (streams.video.avg_frame_rate && eval(streams.video.avg_frame_rate)) ||
    undefined;
  const subtitles = await getSubtitles(id);

  for (const type of ['full', 'forced']) {
    let got = false;
    const subDest = path.resolve(dest, `${name}.en.${type}.srt`);

    if (streams.sub.length) {
      const chosenSubtitleI = await choices(
        `Choose ${type} subtitle stream from file, or none`,
        streams.sub.map((s, i) => ({
          title: `${[s.tags?.language, s.tags?.title]
            .filter((s) => s !== undefined)
            .join(', ')}`,
          value: i,
        }))
      );

      if (chosenSubtitleI !== undefined) {
        const chosenSubtitle = streams.sub[chosenSubtitleI];

        if (!chosenSubtitle) throw new Error('Subtitle stream not found');

        console.log(`Extracting ${type} subtitles to ${subDest}`);

        const extraArgs: FfmpegArg[] =
          chosenSubtitle.codec_name === 'subrip' ? [['-c', 'copy']] : [];

        await runFfmpegCommand(ffmpeg(src).output(subDest), [
          ['-map', `0:s:${chosenSubtitleI}`],
          ...extraArgs,
        ]);
        got = true;
      }
    }

    const typeSubtitles = subtitles.filter((s) =>
      type === 'full'
        ? !s.attributes.foreign_parts_only
        : s.attributes.foreign_parts_only
    );

    if (!got && typeSubtitles.length) {
      const chosenSubtitleI = await choices(
        `Choose ${type} subtitle stream from OpenSubtitles.com, or none. Movie is ${fps} fps`,
        typeSubtitles.map((s, i) => {
          const {
            attributes: {
              release,
              fps,
              new_download_count,
              download_count,
              ratings,
              votes,
              from_trusted,
            },
          } = s;
          return {
            title: `${fps} fps, ${release}, ${
              new_download_count + download_count
            } downloads, rated ${ratings} with ${votes} votes${
              from_trusted ? ' [TRUSTED]' : ''
            }`,
            value: i,
          };
        })
      );

      if (chosenSubtitleI !== undefined) {
        const chosenSubtitle = typeSubtitles[chosenSubtitleI];

        if (!chosenSubtitle) throw new Error('Could not get chosen subtitle');
        const subLink = await getSubtitleLink(chosenSubtitle);
        if (!subLink) throw new Error('Could not get subtitle download link');

        const subRes = await promiseRetry((retry, number) => {
          if (number !== 1) console.log('Trying again');
          return axios
            .get(subLink.link, {
              responseType: 'arraybuffer',
            })
            .catch(retry);
        });

        const subData = Buffer.from(subRes.data, 'binary');

        console.log(
          `Downloading subs, ${subLink.remaining} downloads left`,
          subDest
        );
        await fs.writeFile(subDest, subData);
      }
    }
  }
}

export default async function name(src: string, id: string) {
  const _id = id.toLowerCase().trim();
  const file = await getFile(src);
  const data = await lookupData(_id);

  if (!data && !(await confirm('Data could not be found, continue?')))
    return false;

  let { title, year, poster, backdrop, language } = data || {};

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

  if (
    streams.chapters.length <= 1 &&
    !(await confirm('<= 1 Chapter, continue?'))
  )
    return false;

  if (
    !streams.video.stream.codec_name ||
    (streams.video.stream.codec_name !== 'h264' &&
      !(await confirm(
        `Video not h.264 (${streams.video.stream.codec_name}), continue?`
      )))
  )
    return false;

  if (
    !streams.video.stream.width ||
    (streams.video.stream.width < 1280 &&
      !(await confirm(
        `Video not 720p (${streams.video.stream.width}), continue?`
      )))
  )
    return false;

  if (
    !streams.audio.stream.codec_name ||
    (!MOVIE_AUDIO_TYPES.includes(streams.audio.stream.codec_name) &&
      !(await confirm(
        `Audio not ${MOVIE_AUDIO_TYPES.join('/')} (${
          streams.audio.stream.codec_name
        }), continue?`
      )))
  )
    return false;

  if (
    !streams.audio.stream.channels ||
    (streams.audio.stream.channels < 6 &&
      !(await confirm(
        `Audio not 5.1 surround sound or better (${streams.audio.stream.channels} channels), continue?`
      )))
  )
    return false;

  const name = `${title} (${year}) {imdb-${_id}}`;
  const ext = path.parse(file).ext.toLowerCase().trim().replace(/^\./, '');

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

  await downloadSubtitles({
    src: file,
    id: _id,
    streams: {
      video: streams.video.stream,
      sub: streams.sub,
    },
    dest,
    name: itemName(name),
    language,
  });

  if (poster) await saveArt(poster, path.resolve(dest, POSTER_FILE));
  if (backdrop) await saveArt(backdrop, path.resolve(dest, BACKDROP_FILE));

  const streamMapping: FfmpegArg[] = [
    ['-map', `0:v:${streams.video.index}`],
    ['-map', `0:a:${streams.audio.index}`],
    // ['-map', `0:a:${streams.audio.index}`],
  ];

  return runFfmpegCommand(
    ffmpeg(file)
      .inputOptions(ext === 'avi' ? ['-fflags +genpts'] : [])
      .output(path.resolve(dest, `${itemName(name)}.mkv`)),
    [
      ...streamMapping,
      ['-map_metadata', '-1'],
      ['-c:v', 'copy'],
      ['-c:a', 'copy'],
      // ['-c:a:0', 'libfdk_aac'],
      // ['-c:a:1', 'copy'],
      // ['-filter:a:0', 'loudnorm'],
      // [
      //   '-filter:a:0',
      //   'pan=stereo|FL=FC+0.30*FL+0.30*FLC+0.30*BL+0.30*SL+0.60*LFE|FR=FC+0.30*FR+0.30*FRC+0.30*BR+0.30*SR+0.60*LFE',
      // ],
      // ['-ar:a:0', '48000'],
      // ['-b:a:0', '320k'],
      // ['-ac', '2'],
      // ['-cutoff', '20000'],
      // ['-vbr', '0'],
      // ['-afterburner', '1'],
      ['-metadata:s:v:0', `title=`],
      ['-metadata:s:a', `language=${data?.language || 'en'}`],
      ['-metadata', 'CHECKED=yes'],
    ]
  );
}
