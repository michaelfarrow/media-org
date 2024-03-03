import path from 'path';
import { MUSIC_DOWNLOADS_DIR } from '@server/lib/config';
import { getFileTypes } from '@server/lib/fs';
import queue from '@server/lib/queue';
import checkFile from '@server/jobs/check-file';

async function job() {
  console.log('JOB checkFiles');

  const files = await getFileTypes(
    path.resolve(
      MUSIC_DOWNLOADS_DIR,
      'Zedd - True Colors (2015) [FLAC] (Japanese Edition)'
    ),
    ['m4a', 'flac'],
    {
      depth: -1,
    }
  );

  for (const file of files) {
    queue(checkFile(file));
  }

  return true;
}

job.timeout = 1000 * 60 * 15;

export default job;
