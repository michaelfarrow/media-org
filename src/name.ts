import path from 'path';
import processRaw from '@/workflows/process-raw';
import { MUSIC_NEW_DIR, MUSIC_LOSSESS_NEW_DIR } from './lib/config';

const DEST = path.resolve('.', 'test-root');

async function main() {
  const items: [string, string, string][] = [
    // [
    //   path.resolve(MUSIC_NEW_DIR, 'PVRIS', '2023 - EVERGREEN'),
    //   DEST,
    //   '3d8b28e9-2c58-4079-b459-7310e2a969e1',
    // ],
    [
      path.resolve(MUSIC_LOSSESS_NEW_DIR, 'A', 'A vs_ Monkey Kong'),
      DEST,
      'e4e07e31-42cb-453b-929f-7c380f770246',
    ],
    // [
    //   path.resolve('.', 'test-root', 'A', 'A vs. Monkey Kong'),
    //   DEST,
    //   'e4e07e31-42cb-453b-929f-7c380f770246',
    // ],
  ];

  // const src = path.resolve(MUSIC_NEW_DIR, 'PVRIS', '2023 - EVERGREEN');
  // const id = '3d8b28e9-2c58-4079-b459-7310e2a969e1';

  // const src = path.resolve(MUSIC_LOSSESS_NEW_DIR, 'A', 'A vs_ Monkey Kong');
  // const id = 'e4e07e31-42cb-453b-929f-7c380f770246';

  for (const item of items) {
    await processRaw(...item);
  }
}

main();
