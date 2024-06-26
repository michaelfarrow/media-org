import ffmpeg from '@/lib/ffmpeg';
import { type FfmpegCommand, type FfprobeData } from 'fluent-ffmpeg';

export type FfmpegArg = [string, string] | [string];

export function probeMediaFile(file: string) {
  return ffprobe(file, [['-show_chapters']]);
}

export function ffprobe(
  file: string,
  options: FfmpegArg[] = []
): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg(file).ffprobe(options.flat(), (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

function processOut(out: string) {
  const _out = out.split(/\r\n|\r|\n/)?.filter((line) => line.length);
  return (_out?.length && _out) || undefined;
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
        const stdout = processOut(out);
        const stderr = processOut(err);

        resolve({ stdout, stderr });
      })
      .run();
  });
}
