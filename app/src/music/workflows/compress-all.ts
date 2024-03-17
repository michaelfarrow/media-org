import processLossless from './shared/process-lossless';
import compress from './compress';

import { MUSIC_COMPRESSED_DIR } from '@/lib/config';

export default async function compressAll() {
  return processLossless({
    async processRelease({ release }) {
      await compress(release.path, MUSIC_COMPRESSED_DIR, {
        skipComplete: true,
      });
    },
  });
}
