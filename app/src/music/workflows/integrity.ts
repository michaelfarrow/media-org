import processLossless from './shared/process-lossless';

import path from 'path';
import fs from 'fs-extra';
import { COVER_FILES_TO_CONVERT } from '@/lib/config';

export default async function integrity() {
  return processLossless({
    async processReleaseRaw({ release, info, files }) {
      const src = release.path;

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
        files.map((group) => group.files).flat().length !==
          info.discs.flat().length
      )
        console.log(`Track length mismatch: ${src}`);
    },
  });
}
