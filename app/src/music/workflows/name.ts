import path from 'path';
import processRaw from './process-raw';
import { input } from '@/lib/ui';

export default async function name(src: string, dest: string) {
  const mbId = (await input('MusicBrainz id:')).trim();

  if (!mbId.length) {
    console.log('No id specified');
    return;
  }

  await processRaw(src || path.resolve('.'), dest, mbId);
}
