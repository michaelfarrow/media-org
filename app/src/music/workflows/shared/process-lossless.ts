import { type Item, getDirs } from '@/lib/fs';
import { MUSIC_LOSSESS_DIR } from '@/lib/config';

import processReleases, {
  Options as ProcessReleasesOptions,
} from './process-releases';

export interface Options extends ProcessReleasesOptions {
  processArtist?: (artist: Item) => Promise<void>;
}

export default async function processLossless(options: Options = {}) {
  const { processArtist } = options;

  const artists = await getDirs(MUSIC_LOSSESS_DIR);

  for (const artist of artists) {
    processArtist && (await processArtist(artist));

    await processReleases(artist, options);
  }

  return true;
}
