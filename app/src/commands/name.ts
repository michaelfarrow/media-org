import path from 'path';
import processRaw from '@/workflows/process-raw';
import { MUSIC_LOSSESS_DIR } from '@/lib/config';
import { input } from '@/lib/ui';

export default async function nameCommand(src?: string) {
  const mbId = (await input('MusicBrainz id:')).trim();

  if (!mbId.length) {
    console.log('No id specified');
    return;
  }

  return await processRaw(src || path.resolve('.'), MUSIC_LOSSESS_DIR, mbId);
}
