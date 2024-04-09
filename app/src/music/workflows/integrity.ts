import path from 'path';
import fs from 'fs-extra';
import { runFfmpegCommand } from '@/lib/media';
import ffmpeg from '@/lib/ffmpeg';
import { COVER_FILES_TO_CONVERT } from '@/lib/config';

import processRelease from './shared/process-release';

export default async function integrity(src: string) {
  const { info, files } = await processRelease(src);

  if (!info) console.log(`Release file does not exist: ${src}`);

  const coverFiles: string[] = [];
  for (const file of COVER_FILES_TO_CONVERT) {
    if (await fs.exists(path.resolve(src, file))) {
      coverFiles.push(file);
    }
  }

  if (!coverFiles.length) console.log(`Cover file not available: ${src}`);

  if (
    info &&
    files.map((group) => group.files).flat().length !== info.discs.flat().length
  )
    console.log(`Track length mismatch: ${src}`);

  for (const group of files) {
    for (const file of group.files) {
      const { stderr } = await runFfmpegCommand(
        ffmpeg(file.path, { stdoutLines: 0 })
          .inputOptions(['-v error'])
          .output('-'),
        [['-f', 'null']]
      );

      if (stderr?.length) {
        console.log(
          `${stderr.length} error${stderr.length === 1 ? '' : 's'} found in ${
            file.path
          }`
        );
      }
    }
  }
}
