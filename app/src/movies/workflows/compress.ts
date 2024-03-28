import path from 'path';
import fs from 'fs-extra';
import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';
import { MOVIE_AUDIO_TYPES } from '@/lib/config';

import { processMovies } from './shared/process-movies';

export default async function compress(src: string) {
  await processMovies(src, async ({ file, data, streams }) => {
    if (
      streams.video.width &&
      streams.video.width >= 1280 &&
      MOVIE_AUDIO_TYPES.includes(streams.audio.codec_name || '')
    ) {
      if (
        !file.nameWithoutExt.endsWith('- original') &&
        data.format.tags?.COMPRESSED !== 'yes'
      ) {
        const originalPath = path.resolve(
          file.dir,
          `${file.nameWithoutExt} - original.${file.ext}`
        );

        const compressedPath = path.resolve(
          file.dir,
          `${file.nameWithoutExt} - compressed.${file.ext}`
        );

        const tempPath = path.resolve(
          file.dir,
          `${file.nameWithoutExt} - temp.${file.ext}`
        );

        await runFfmpegCommand(ffmpeg(file.path).output(tempPath), [
          ['-map', '0'],
          ['-c:a', 'copy'],
          ['-c:s', 'copy'],
          ['-c:v', 'libx264'],
          ['-crf', '17'],
          ['-preset', 'medium'],
          ['-vf', 'scale=1280:-2'],
          ['-g', '30'], // Set i-frames every 30 frames to speed up scrubbing
          // ['-t', '00:00:10'],
          ['-metadata', 'COMPRESSED=yes'],
        ]);

        await fs.rename(file.path, originalPath);
        await fs.rename(tempPath, compressedPath);
      }
    }
  });
}
