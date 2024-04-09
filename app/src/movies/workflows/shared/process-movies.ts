import { getDirs } from '@/lib/fs';
import { processMovie } from './process-movie';

export async function processMovies(src: string) {
  const movieDirs = await getDirs(src);

  const movies: Awaited<ReturnType<typeof processMovie>>[] = [];

  for (const movieDir of movieDirs) {
    movies.push(await processMovie(movieDir.path));
  }

  return movies;
}
