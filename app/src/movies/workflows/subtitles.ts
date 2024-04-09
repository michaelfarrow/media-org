import fs from 'fs-extra';
import { parse, map, stringify } from 'subtitle';
import colors from 'colors';
import { stripHtml } from 'string-strip-html';
import path from 'path';
import { type File, getFileTypes } from '@/lib/fs';
import ffmpeg from '@/lib/ffmpeg';

import { processMovie } from './shared/process-movie';

async function processSrt(file: File, data: ffmpeg.FfprobeData) {
  const duration = data.format.duration;

  if (!duration) throw new Error(`Could not get duration: ${file.path}`);

  const tempDest = path.resolve(
    file.dir,
    `.${file.nameWithoutExt}.temp.${file.ext}`
  );

  const { html, warnings } = await new Promise<{
    html: boolean;
    warnings: string[];
  }>((resolve, reject) => {
    let html = false;
    let warnings: string[] = [];

    fs.createReadStream(file.path)
      .pipe(parse())
      .pipe(
        map((node) => {
          if (node.type === 'cue') {
            const cleaned = stripHtml(node.data.text).result;

            if (node.data.text !== cleaned) {
              html = true;
            }

            const end = node.data.end / 1000;

            if (duration - Math.min(duration, end) < 50) {
              warnings.push('Subtitle(s) close to the end.');
            }

            node.data.text = cleaned;
          }

          return node;
        })
      )
      .pipe(stringify({ format: 'SRT' }))
      .pipe(fs.createWriteStream(tempDest))
      .on('error', reject)
      .on('finish', () => resolve({ html, warnings }));
  });

  if (warnings.length) {
    for (const warning of warnings) {
      console.log(colors.yellow(warning));
    }
  }

  if (html) {
    console.log('Removed HTML');
    await fs.move(tempDest, file.path, { overwrite: true });
  } else {
    await fs.remove(tempDest);
  }
}

export default async function subtitles(src: string) {
  const movie = await processMovie(src);
  const { file, data } = movie;

  if (data.format.tags?.CHECKED !== 'yes') return;
  const subtitleFiles = await getFileTypes(file.dir, ['srt']);

  for (const subtitleFile of subtitleFiles) {
    if (subtitleFile.name.startsWith('.')) continue;
    console.log('Processing', subtitleFile.path);
    await processSrt(subtitleFile, data);
  }
}
