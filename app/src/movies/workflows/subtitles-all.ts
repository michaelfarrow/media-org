import { getDirs } from '@/lib/fs';
import subtitles from './subtitles';

export default async function subtitlesAll(src: string) {
  const movieDirs = await getDirs(src);

  for (const movieDir of movieDirs) {
    await subtitles(movieDir.path);
  }
}
