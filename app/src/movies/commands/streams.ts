import streams from '../workflows/streams';
import { MOVIES_DIR } from '@/lib/config';

export default async function streamsCommand() {
  return await streams(MOVIES_DIR);
}
