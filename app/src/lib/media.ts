import ffmpeg from '@/lib/ffmpeg';
import { type FfmpegCommand, type FfprobeData } from 'fluent-ffmpeg';

export type FfmpegArg = [string, string];

export function probeMediaFile(file: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg(file).ffprobe(['-show_chapters'], (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

export function runFfmpegCommand(
  command: FfmpegCommand,
  options: FfmpegArg[] = []
): Promise<{ stdout?: string[]; stderr?: string[] }> {
  console.log(
    'Ffmpeg options:',
    options.map((option) => option.join(' '))
  );

  return new Promise((resolve, reject) => {
    command
      .withOptions(...options.flat())
      .on('start', function (cliLine: string) {
        console.log(`Spawned Ffmpeg with command: ${cliLine}`);
      })
      .on('progress', function (progress: { percent?: number }) {
        progress.percent &&
          console.log(`Processing: ${Math.round(progress.percent)}%`);
      })
      .on('error', reject)
      .on('end', (out: string, err: string) => {
        const stdout = (out.length && out.split(/\r\n|\r|\n/)) || undefined;
        const stderr = (err.length && err.split(/\r\n|\r|\n/)) || undefined;

        resolve({ stdout, stderr });
      })
      .run();
  });
}
