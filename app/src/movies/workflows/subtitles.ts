import fs from 'fs-extra';
import { parse, map, stringify } from 'subtitle';
import colors from 'colors';
import { stripHtml } from 'string-strip-html';
import path from 'path';
import { type File, getFileTypes } from '@/lib/fs';
import ffmpeg from '@/lib/ffmpeg';
import { uniq } from 'lodash';
import Typo from 'typo-js';

import { processMovie } from './shared/process-movie';

const INCORRECT_WORD_PERCENT = 1;
const dictionary = new Typo('en_US');

const segmenter = new (Intl as any).Segmenter([], { granularity: 'word' });

function toWords(text: string) {
  const segmentedText = segmenter.segment(text);
  const words: string[] = [...segmentedText]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);

  return words;
}

function getUnicode(char: string) {
  const code = char.codePointAt(0);
  if (code === undefined) return null;
  const hex = code.toString(16);
  return '\\u' + '0000'.substring(0, 4 - hex.length) + hex;
}

async function processSrt(file: File, data: ffmpeg.FfprobeData) {
  const duration = data.format.duration;
  let wordTotal = 0;
  const wordIncorrect: string[] = [];
  const nonLatinChars: string[] = [];

  if (!duration) throw new Error(`Could not get duration: ${file.path}`);

  const tempDest = path.resolve(
    file.dir,
    `.${file.nameWithoutExt}.temp.${file.ext}`
  );

  const { altered, warnings } = await new Promise<{
    altered: boolean;
    warnings: string[];
  }>((resolve, reject) => {
    let altered = false;
    let warnings: string[] = [];

    fs.createReadStream(file.path)
      .pipe(parse())
      .pipe(
        map((node) => {
          if (node.type === 'cue') {
            let cleaned = stripHtml(node.data.text).result;
            cleaned = cleaned.replace(/’/g, "'");

            const words = toWords(cleaned);

            for (const word of words) {
              wordTotal++;
              if (isNaN(Number(word)) && !dictionary.check(word)) {
                wordIncorrect.push(word.toLowerCase());
              }
            }

            const _nonLatinChars = cleaned.match(
              new RegExp(
                `[^${[
                  '\u0000-\u007F', // Basic Latin
                  '\u0080-\u00FF', // Latin Extended-A
                  '\u0180-\u024F', // Latin Extended-B
                  '\u2000-\u206F', // General Punctuation
                  '\u266a', // ♪
                ].join('|')}]`,
                'g'
              )
            );

            if (_nonLatinChars?.length) nonLatinChars.push(..._nonLatinChars);

            if (node.data.text !== cleaned) {
              altered = true;
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
      .on('finish', () => resolve({ altered, warnings }));
  });

  const incorrectWordPercent = (wordIncorrect.length / wordTotal) * 100;

  if (incorrectWordPercent > INCORRECT_WORD_PERCENT) {
    warnings.push(
      `More than ${INCORRECT_WORD_PERCENT}% of words spelled incorrectly: (${uniq(
        wordIncorrect
      ).join(', ')})`
    );
  }

  if (nonLatinChars.length) {
    warnings.push(
      `Non latin characters detected: (${uniq(nonLatinChars)
        .map((c) => `"${c}" (${getUnicode(c)})`)
        .join(', ')})`
    );
  }

  if (warnings.length) {
    for (const warning of uniq(warnings)) {
      console.log(colors.yellow(warning));
    }
  }

  if (altered) {
    console.log('Cleaned');
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
