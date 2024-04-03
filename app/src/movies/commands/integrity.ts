import integrity from '../workflows/integrity';
import { MOVIES_DIR } from '@/lib/config';

export default async function integrityCommand() {
  return await integrity(MOVIES_DIR);
}
