// import { getSubtitles } from '@/lib/movies';
// import { log } from '@/lib/debug';
// import { processMovies } from './shared/process-movies';

// export default async function subtitles(src: string) {
//   await processMovies(src, async ({ file, streams }) => {
//     const fps =
//       (streams.video.avg_frame_rate &&
//         Number(eval(streams.video.avg_frame_rate))) ||
//       undefined;

//     const subtitles = await getSubtitles({ src: file.path, fps });

//     if (subtitles.valid.length) {
//       console.log(file.path);
//       // if (subtitles.chosen === -1) {
//       console.log(fps);
//       log(subtitles.valid.map((subtitle) => subtitle.attributes.fps));
//       // } else {
//       //   log(subtitles.valid[subtitles.chosen].id);
//       // }
//       console.log('');
//     }
//   });
// }

import fs from 'fs-extra';
import { parse, map, stringify } from 'subtitle';
import { stripHtml } from 'string-strip-html';
import path from 'path';
import { type File, getFileTypes } from '@/lib/fs';
import ffmpeg from '@/lib/ffmpeg';

import { processMovies } from './shared/process-movies';

async function processSrt(file: File, data: ffmpeg.FfprobeData) {
  const duration = data.format.duration;

  if (!duration) throw new Error(`Could not get duration: ${file.path}`);

  // const tempDest = path.resolve(
  //   file.dir,
  //   `.${file.nameWithoutExt}.temp.${file.ext}`
  // );

  const tempDest = path.resolve(
    file.dir,
    `.${file.nameWithoutExt}.temp.${file.ext}`
  );

  await new Promise<{ html: boolean; warnings: string[] }>(
    (resolve, reject) => {
      let html = false;
      let warnings: string[] = [];

      fs.createReadStream(file.path)
        .pipe(parse())
        .pipe(
          map((node) => {
            // console.log(node.type);
            if (node.type === 'cue') {
              const cleaned = stripHtml(node.data.text).result;

              if (node.data.text !== cleaned) {
                html = true;
              }

              // const start = node.data.start / 1000;
              const end = node.data.end / 1000;
              // const d = end - start;

              if (duration - Math.min(duration, end) < 50) {
                warnings.push('Subtitle(s) close to the end.');
              }

              // if (d > 10) {
              //   console.log(file.path);
              //   console.log(d, node.data.text);
              //   console.log();
              // }

              // convert all cues to uppercase
              node.data.text = cleaned;
            }

            return node;
          })
        )
        // .pipe(stringify({ format: 'SRT' }))
        // .pipe(fs.createWriteStream(tempDest))
        .on('data', () => {})
        .on('error', reject)
        .on('finish', () => resolve({ html, warnings }));
    }
  );

  await fs.move(tempDest, file.path, { overwrite: true });
}

export default async function subtitles(src: string) {
  await processMovies(src, async ({ file, data }) => {
    if (data.format.tags?.CHECKED !== 'yes') return;

    const subtitleFiles = await getFileTypes(file.dir, ['srt']);

    for (const subtitleFile of subtitleFiles) {
      if (subtitleFile.name.startsWith('.')) continue;
      console.log('Processing', subtitleFile);
      await processSrt(subtitleFile, data);
    }
  });
}
