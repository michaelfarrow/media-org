import path from 'path';
import fs from 'fs-extra';
import ffmpeg from '@server/lib/ffmpeg';
import { CHECK_DIR } from '@server/lib/config';
import { type File } from '@server/lib/fs';
import { runFfmpegCommand } from '@server/lib/music';

export default function (file: File) {
  async function job() {
    console.log('JOB checkFile', file.path);

    const destDir = path.resolve(path.dirname(file.path), CHECK_DIR);
    const dest = path.resolve(destDir, `${file.nameWithoutExt}.png`);

    await fs.ensureDir(destDir);

    if (!(await fs.exists(dest))) {
      await runFfmpegCommand(ffmpeg(file.path).output(dest), [
        [
          '-lavfi',
          'showspectrumpic=s=1000x800:mode=separate:start=15k:stop=24k:scale=log',
        ],
      ]);
    } else {
      console.log('done, skipping');
    }

    return true;
  }

  job.timeout = 1000 * 60 * 5;

  return job;
}
