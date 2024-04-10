import { Command } from '@commander-js/extra-typings';
import path from 'path';
import colors from 'colors';

import { MOVIES_DIR } from '@/lib/config';

import name from './workflows/name';
import subtitles from './workflows/subtitles';
import subtitlesAll from './workflows/subtitles-all';
import compress from './workflows/compress';
import update from './workflows/update';
import streams from './workflows/streams';
import integrity from './workflows/integrity';
import integrityAll from './workflows/integrity-all';
import audio from './workflows/audio';

const CURRENT_DIR = path.resolve('.');

const program = new Command();

program
  .name('movies-org')
  .description('CLI to some orgnaise movies')
  .version('0.1.0');

program
  .command('name')
  .argument('[source]', 'source directory')
  .argument('[dest]', 'destination directory')
  .action((src, dest) => name(src || CURRENT_DIR, dest || MOVIES_DIR));

program
  .command('subtitles')
  .argument('[source]', 'source directory')
  .action((src) => subtitles(src || CURRENT_DIR));

program
  .command('subtitles-all')
  .argument('[source]', 'source directory')
  .action((src) => subtitlesAll(src || MOVIES_DIR));

program
  .command('compress')
  .argument('[source]', 'source directory')
  .action((src) => compress(src || MOVIES_DIR));

program
  .command('update')
  .argument('[source]', 'source directory')
  .action((src) => update(src || MOVIES_DIR));

program
  .command('streams')
  .argument('[source]', 'source directory')
  .action((src) => streams(src || MOVIES_DIR));

program
  .command('integrity')
  .argument('[source]', 'source directory')
  .action((src) => integrity(src || CURRENT_DIR));

program
  .command('integrity-all')
  .argument('[source]', 'source directory')
  .action((src) => integrityAll(src || MOVIES_DIR));

program
  .command('audio')
  .argument('[source]', 'source directory')
  .action((src) => audio(src || MOVIES_DIR));

program.parseAsync().catch((e) => {
  console.log(colors.red(e.message || 'Error'));
});
