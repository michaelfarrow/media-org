import { getDirs } from '@/lib/fs';
import integrity from './integrity';

export default async function integrityAll(src: string) {
  const movieDirs = await getDirs(src);

  for (const movieDir of movieDirs) {
    await integrity(movieDir.path);
  }
}
