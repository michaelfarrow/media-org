import { getSubtitles } from '@/lib/movies';
import { log } from '@/lib/debug';
import { processMovies } from './shared/process-movies';

export default async function subtitles(src: string) {
  const movies = await processMovies(src);

  for (const { file, streams } of movies) {
    const fps =
      (streams.video.avg_frame_rate &&
        Number(eval(streams.video.avg_frame_rate))) ||
      undefined;

    // const subtitles = await getSubtitles({ src: file.path, fps });

    // if (subtitles.length) {
    //   console.log(file.path);
    //   // if (subtitles.chosen === -1) {
    //   console.log(fps);
    //   log(subtitles.map((subtitle) => subtitle.attributes.fps));
    //   // } else {
    //   //   log(subtitles.valid[subtitles.chosen].id);
    //   // }
    //   console.log('');
    // }
  }
}
