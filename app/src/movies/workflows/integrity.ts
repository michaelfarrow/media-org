import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function integrity(src: string) {
  await processMovies(src, async ({ file, data }) => {
    if (data.format.tags?.CHECKED !== 'yes') return;

    const { stderr } = await runFfmpegCommand(
      ffmpeg(file.path, { stdoutLines: 0 })
        .inputOptions(['-v error'])
        .output('-'),
      [
        ['-map', '0:v:0'],
        ['-c', 'copy'],
        ['-f', 'null'],
      ]
    );

    if (stderr?.length) {
      console.log(`${stderr.length} errors found in ${file.path}`);
    }
  });
}
