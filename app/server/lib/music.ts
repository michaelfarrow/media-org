import { type File, getFileTypes, removeRootPath } from '@server/lib/fs';
import { FfmpegCommand } from 'fluent-ffmpeg';
import { orderBy } from 'natural-orderby';

export type FfmpegArg = [string, string];

export type GroupedFiles = {
  group: string;
  files: File[];
};

export function runFfmpegCommand(
  command: FfmpegCommand,
  options: FfmpegArg[] = []
): Promise<true> {
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
      .on('end', () => resolve(true))
      .run();
  });
}

export async function getReleaseFiles(dir: string, exts = ['m4a', 'flac']) {
  try {
    const files = await getFileTypes(dir, exts, { depth: 1 });

    const grouped: GroupedFiles[] = [];

    for (const file of files) {
      let group = removeRootPath(file.dir, dir);
      const discNumber = file.name.match(/^(\d+)-\d+/);

      if (group === '' && discNumber) {
        group = discNumber[1];
      }

      if (!grouped.find((item) => item.group === group))
        grouped.push({ group, files: [] });

      grouped.find((item) => item.group === group)?.files.push(file);
    }

    return orderBy(grouped, (item) => item.group).map((item) => ({
      ...item,
      files: orderBy(item.files, (item) => item.name),
    }));
  } catch (e) {
    return [];
  }
}
