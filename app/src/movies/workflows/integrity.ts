import { runFfmpegCommand, ffprobe } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function integrity(src: string) {
  await processMovies(src, async ({ file, data }) => {
    if (data.format.tags?.CHECKED !== 'yes') return;

    const probeData = await ffprobe(file.path, [
      ['-show_entries', 'stream=r_frame_rate,nb_read_frames,duration'],
      ['-select_streams', 'v'],
      ['-count_frames'],
      // ['-of', 'compact=p=1:nk=1'],
      ['-threads', '4'],
      ['-v', '0'],
    ]);

    const {
      format: { duration },
      streams,
    } = probeData;
    const stream = streams[0];

    const { r_frame_rate, nb_read_frames } = stream;

    if (duration && r_frame_rate && nb_read_frames) {
      if (
        Math.abs(Number(nb_read_frames) - eval(r_frame_rate) * duration) > 5
      ) {
        console.log(
          `frame count mismatch (${nb_read_frames} read frames, ${r_frame_rate} fps, duration ${duration}) in ${file.path}`
        );
      }
    }

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
