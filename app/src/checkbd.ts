import path from 'path';
import { MUSIC_LOSSESS_DIR } from '@/lib/config';
import { getFileTypes } from '@/lib/fs';
import { audioFileBitDepth, audioFileSampleRate } from '@/lib/audio';

async function main() {
  const files = await getFileTypes(path.resolve(MUSIC_LOSSESS_DIR), ['m4a'], {
    depth: 2,
  });

  console.log('Got', files.length, 'm4a files');

  for (const file of files) {
    const bd = await audioFileBitDepth(file.path);
    const sampleRate = await audioFileSampleRate(file.path);
    if (bd !== 16 || sampleRate !== 44100)
      console.log(file.path, bd, sampleRate);
  }
}

main();
