import fs from 'fs-extra';
import path from 'path';
import { runFfmpegCommand, ffprobe } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

export default async function integrity(src: string) {
  const movies = await processMovies(src);

  for (const { file, data } of movies) {
    const logPath = path.resolve(file.dir, `.${file.nameWithoutExt}.error.log`);

    if (data.format.tags?.CHECKED !== 'yes') continue;
    if (await fs.exists(logPath)) continue;

    const errors: string[] = [];

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
        errors.push(
          `frame count mismatch (${nb_read_frames} read frames, ${r_frame_rate} fps, duration ${duration})`
        );
      }
    }

    const { stderr } = await runFfmpegCommand(
      ffmpeg(file.path, { stdoutLines: 0 })
        .inputOptions(['-v error'])
        .output('-'),
      [
        // ['-map', '0:v:0'],
        ['-f', 'null'],
      ]
    );

    const errorsFiltered = stderr?.filter((line) => {
      if (line.match(/last message repeated \d+ times?/i)) return false;
      if (line.match(/non monotonically increasing/i)) return false;
      return true;
    });

    if (errorsFiltered?.length) {
      errors.push(
        [
          `${errorsFiltered.length} error${
            errorsFiltered.length === 1 ? '' : 's'
          } found:`,
          ...errorsFiltered,
        ].join('\n')
      );
    }

    if (errors.length) {
      await fs.writeFile(logPath, `${errors.join('\n\n')}\n`);
      console.log('Errors found in', file.path);
    }
  }
}
