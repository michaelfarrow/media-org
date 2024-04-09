import { MOVIE_TYPES } from '@/lib/config';
import { getFileTypes } from '@/lib/fs';
import { probeMediaFile } from '@/lib/media';

export async function processMovie(src: string) {
  const movieFiles = (await getFileTypes(src, MOVIE_TYPES)).filter(
    (file) => !file.nameWithoutExt.endsWith('.temp')
  );

  const normalMovieFiles = movieFiles.filter(
    (file) => !file.nameWithoutExt.startsWith('.')
  );

  const originalMovieFiles = movieFiles.filter((file) =>
    file.nameWithoutExt.startsWith('.')
  );

  if (!movieFiles.length)
    throw new Error(`Cannot find any movie files at "${src}"`);

  const movieFile = originalMovieFiles[0] || normalMovieFiles[0];

  const data = await probeMediaFile(movieFile.path);

  const videoStreams = data.streams.filter(
    (stream) => stream.codec_type === 'video'
  );
  const audioStreams = data.streams.filter(
    (stream) => stream.codec_type === 'audio'
  );
  const subStreams = data.streams.filter(
    (stream) => stream.codec_type === 'subtitle'
  );

  if (!videoStreams.length)
    throw new Error(`Cannot find any video streams in "${movieFile.path}"`);
  if (videoStreams.length > 1)
    throw new Error(`Too many video streams in "${movieFile.path}"`);

  if (!audioStreams.length)
    throw new Error(`Cannot find any audio streams in "${movieFile.path}"`);
  if (audioStreams.length > 2)
    throw new Error(`Too many audio streams in "${movieFile.path}"`);

  return {
    file: movieFile,
    data,
    streams: {
      video: videoStreams[0],
      audio: audioStreams,
      sub: subStreams,
    },
  };
}
