import subtitles from '../workflows/subtitles';
import { MOVIES_DIR } from '@/lib/config';

export default async function subtitlesCommand() {
  return await subtitles(MOVIES_DIR);
}
