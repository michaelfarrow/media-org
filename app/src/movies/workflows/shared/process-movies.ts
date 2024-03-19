import { MOVIE_TYPES } from '@/lib/config';
import { getDirs, getFileTypes, type File } from '@/lib/fs';
import { probeMediaFile } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

export async function processMovies(
  src: string,
  process: (data: {
    file: File;
    data: ffmpeg.FfprobeData;
    streams: {
      video: ffmpeg.FfprobeStream;
      audio: ffmpeg.FfprobeStream;
      sub: ffmpeg.FfprobeStream[];
    };
  }) => Promise<any>
) {
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
    if (audioStreams.length > 1)
      throw new Error(`Too many audio streams in "${movieFile.path}"`);

    await process({
      file: movieFiles[0],
      data,
      streams: {
        video: videoStreams[0],
        audio: audioStreams[0],
        sub: subStreams,
      },
    });
  }
}
