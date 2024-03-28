import path from 'path';
import fs from 'fs-extra';
import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';
import { MOVIE_AUDIO_TYPES } from '@/lib/config';

import { processMovies } from './shared/process-movies';

export default async function compress(src: string) {
  await processMovies(src, async ({ file, streams }) => {
    if (
      streams.video.width &&
      streams.video.width >= 1280 &&
      MOVIE_AUDIO_TYPES.includes(streams.audio.codec_name || '')
    ) {
      if (!file.nameWithoutExt.match(/\.original$/)) {
        const originalPath = path.resolve(
          file.dir,
          `${file.nameWithoutExt}.original.${file.ext}`
        );

        const tempPath = path.resolve(
          file.dir,
          `${file.nameWithoutExt}.temp.${file.ext}`
        );

        await runFfmpegCommand(ffmpeg(file.path).output(tempPath), [
          ['-map', '0'],
          ['-c:a', 'copy'],
          ['-c:s', 'copy'],
          ['-c:v', 'libx264'],
          ['-crf', '16'],
          ['-profile', 'medium'],
          ['-vf', 'scale=1280:-2'],
          ['-g', '30'], // Set i-frames every 30 frames to speed up scrubbing
        ]);

        await fs.rename(file.path, originalPath);
        await fs.rename(tempPath, file.path);
      }
    }
  });
}
