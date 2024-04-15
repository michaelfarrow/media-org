import path from 'path';
import fs from 'fs-extra';
import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function audio(src: string) {
  const movies = await processMovies(src);

  for (const { file, data, streams } of movies) {
    if (
      streams.audio.length === 1 &&
      (streams.audio?.[0].channels || 0) >= 6 &&
      data.format.tags?.CHECKED === 'yes'
    ) {
      const tempPath = path.resolve(
        file.dir,
        `.${file.nameWithoutExt}.temp.${file.ext}`
      );

      await runFfmpegCommand(ffmpeg(file.path).output(tempPath), [
        ['-map', '0:v'],
        ['-map', '0:a:0'],
        ['-map', '0:a:0'],
        ['-c:v', 'copy'],
        ['-c:a:0', 'libfdk_aac'],
        ['-c:a:1', 'copy'],
        ['-filter:a:0', 'loudnorm=I=-14:TP=-1'],
        // [
        //   '-filter:a:0',
        //   'pan=stereo|FL=FC+0.30*FL+0.30*FLC+0.30*BL+0.30*SL+0.60*LFE|FR=FC+0.30*FR+0.30*FRC+0.30*BR+0.30*SR+0.60*LFE',
        // ],
        ['-ar:a:0', '48000'],
        ['-b:a:0', '320k'],
        ['-ac', '2'],
        ['-cutoff', '20000'],
        ['-vbr', '0'],
        ['-afterburner', '1'],
      ]);

      await fs.remove(file.path);
      await fs.rename(tempPath, file.path);
    }
  }
}
