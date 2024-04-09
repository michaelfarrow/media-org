import { Command } from '@commander-js/extra-typings';
import path from 'path';
import colors from 'colors';

import { MUSIC_COMPRESSED_DIR, MUSIC_LOSSESS_DIR } from '@/lib/config';

import check from './workflows/check';
import name from './workflows/name';
import update from './workflows/update';
import compress from './workflows/compress';
import compressAll from './workflows/compress-all';
import integrity from './workflows/integrity';
import integrityAll from './workflows/integrity-all';
import art from './workflows/art';
import updateInfo from './workflows/update-info';
import releases from './workflows/releases';

const CURRENT_DIR = path.resolve('.');

const program = new Command();

program
  .name('music-org')
  .description('CLI to some orgnaise music')
  .version('0.1.0');

program
  .command('check')
  .argument('[source]', 'source directory')
  .action((src) => check(src || CURRENT_DIR));

program
  .command('name')
  .argument('[source]', 'source directory')
  .argument('[dest]', 'destination directory')
  .action((src, dest) => name(src || CURRENT_DIR, dest || MUSIC_LOSSESS_DIR));

program
  .command('update')
  .argument('[source]', 'source directory')
  .argument('[dest]', 'destination directory')
  .action((src, dest) => update(src || CURRENT_DIR, dest || MUSIC_LOSSESS_DIR));

program
  .command('compress')
  .argument('[source]', 'source directory')
  .argument('[dest]', 'destination directory')
  .action((src, dest) =>
    compress(src || CURRENT_DIR, dest || MUSIC_COMPRESSED_DIR)
  );

program
  .command('compress-all')
  .argument('[source]', 'source directory')
  .argument('[dest]', 'destination directory')
  .action((src, dest) =>
    compressAll(src || MUSIC_LOSSESS_DIR, dest || MUSIC_COMPRESSED_DIR)
  );

program
  .command('integrity')
  .argument('[source]', 'source directory')
  .action((src) => integrity(src || CURRENT_DIR));

program
  .command('integrity-all')
  .argument('[source]', 'source directory')
  .action(async (src) => integrityAll(src || MUSIC_LOSSESS_DIR));

program
  .command('art')
  .argument('[source]', 'source directory')
  .action((src) => art(src || MUSIC_COMPRESSED_DIR));

program
  .command('update-info')
  .argument('[source]', 'source directory')
  .action((src) => updateInfo(src || MUSIC_LOSSESS_DIR));

program
  .command('releases')
  .argument('[source]', 'source directory')
  .option(
    '-a --all',
    'all releases, otherwise anything in current year and last'
  )
  .action((src, { all }) => releases(src || MUSIC_LOSSESS_DIR, all));

program.parseAsync().catch((e) => {
  console.log(colors.red(e.message || 'Error'));
});
