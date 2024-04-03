import { runFfmpegCommand, ffprobe } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function integrity(src: string) {
  await processMovies(src, async ({ file, data }) => {
    if (data.format.tags?.CHECKED !== 'yes') return;

    if (!file.path.includes('³')) return;

    const test = await ffprobe(file.path, [
      ['-show_entries', 'stream=r_frame_rate,nb_read_frames,duration'],
      ['-select_streams', 'v'],
      ['-count_frames'],
      ['-of', 'compact=p=1:nk=1'],
      ['-threads', '3'],
      ['-v', '0'],
    ]);

    console.log(test);

    const { stderr } = await runFfmpegCommand(
      ffmpeg(file.path, { stdoutLines: 0 })
        .inputOptions(['-v error'])
        .output('-'),
      [
        ['-map', '0:v:0'],
        ['-f', 'null'],
      ]
    );

    if (stderr?.length) {
      console.log(`${stderr.length} errors found in ${file.path}`);
    }
  });
}
