import { MOVIE_TYPES } from '@/lib/config';
import { getDirs, getFileTypes } from '@/lib/fs';
import { probeMediaFile } from '@/lib/media';
import { getSubtitles } from '@/lib/movies';
import { log } from '@/lib/debug';

export default async function subtitles(src: string) {
  const movieDirs = await getDirs(src);

  for (const movieDir of movieDirs) {
    const movieFiles = await getFileTypes(movieDir.path, MOVIE_TYPES);

    if (!movieFiles.length)
      throw new Error(`Cannot find any movie files at "${movieDir}"`);

    const movieFile = movieFiles[0];

    const data = await probeMediaFile(movieFile.path);
    const videoStreams = data.streams.filter(
      (stream) => stream.codec_type === 'video'
    );

    if (!videoStreams.length)
      throw new Error(`Cannot find any video streams in "${movieFile.path}"`);
    if (videoStreams.length > 1)
      throw new Error(`Too many video streams in "${movieFile.path}"`);

    const videoStream = videoStreams[0];
    const fps =
      (videoStream.avg_frame_rate &&
        Number(eval(videoStream.avg_frame_rate))) ||
      undefined;

    const subtitles = await getSubtitles(movieFile.path, fps);

    if (subtitles.valid.length) {
      console.log(movieFile.path);
      // if (subtitles.chosen === -1) {
      console.log(fps);
      log(subtitles.valid.map((subtitle) => subtitle.attributes.fps));
      // } else {
      //   log(subtitles.valid[subtitles.chosen].id);
      // }
      console.log('');
    }
  }
}
