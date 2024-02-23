import path from 'path';
import update from '@/workflows/update';
import { MUSIC_LOSSESS_FINAL_DIR } from '@/lib/config';

export default async function updateCommand(src?: string) {
  return await update(
    src || path.resolve('.'),
    MUSIC_LOSSESS_FINAL_DIR
    // path.resolve('.', 'test-compressed')
  );
}
