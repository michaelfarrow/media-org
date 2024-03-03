import path from 'path';
import compress from '@/workflows/compress';
import { MUSIC_COMPRESSED_DIR } from '@/lib/config';

export default async function compressCommand(src?: string) {
  return await compress(src || path.resolve('.'), MUSIC_COMPRESSED_DIR);
}
