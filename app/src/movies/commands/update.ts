import update from '../workflows/update';
import { MOVIES_DIR } from '@/lib/config';

export default async function updateCommand() {
  return await update(MOVIES_DIR);
}
