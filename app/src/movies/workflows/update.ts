import path from 'path';
import fs from 'fs-extra';
import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function update(src: string) {
  await processMovies(src, async ({ file, data, streams }) => {
    if (data.format.tags?.CHECKED === 'yes' && streams.audio.length === 2) {
      const tempPath = path.resolve(
        file.dir,
        `.${file.nameWithoutExt}.temp.${file.ext}`
      );

      await runFfmpegCommand(ffmpeg(file.path).output(tempPath), [
        ['-map', '0:v'],
        ['-map', '0:a:1'],
        ['-c:a', 'copy'],
        ['-c:v', 'copy'],
        // ['-t', '00:01:00'],
      ]);

      await fs.remove(file.path);
      await fs.rename(tempPath, file.path);
    }
  });
}
