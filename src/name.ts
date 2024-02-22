import processRaw from '@/workflows/process-raw';
import { MUSIC_LOSSESS_FINAL_DIR } from '@/lib/config';
import { input } from '@/lib/ui';

async function main() {
  console.log(__dirname);

  // const src = (await input('Source directory:')).trim();
  const mbId = (await input('MusicBrainz id:')).trim();

  if (!mbId.length) {
    console.log('No id specified');
    return;
  }

  await processRaw(__dirname, MUSIC_LOSSESS_FINAL_DIR, mbId);
}

main();
