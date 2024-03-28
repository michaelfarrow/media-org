import compress from '../workflows/compress';
import { MOVIES_DIR } from '@/lib/config';

export default async function compressCommand() {
  return await compress(MOVIES_DIR);
}
