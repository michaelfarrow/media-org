import { Command } from '@commander-js/extra-typings';
import check from './commands/check';
import name from './commands/name';
import update from './commands/update';
import compress from './commands/compress';
import compressAll from './commands/compress-all';
import integrity from './commands/integrity';
import art from './commands/art';
import updateInfo from './commands/update-info';
import releases from './commands/releases';

const program = new Command();

program
  .name('music-org')
  .description('CLI to some orgnaise music')
  .version('0.1.0');

program
  .command('check')
  .argument('[source]', 'source directory')
  .action(async (src) => {
    await check(src);
  });

program
  .command('name')
  .argument('[source]', 'source directory')
  .action(async (src) => {
    await name(src);
  });

program
  .command('update')
  .argument('[source]', 'source directory')
  .action(async (src) => {
    await update(src);
  });

program
  .command('compress')
  .argument('[source]', 'source directory')
  .action(async (src) => {
    await compress(src);
  });

program.command('compress-all').action(async () => {
  await compressAll();
});

program.command('integrity').action(async () => {
  await integrity();
});

program.command('art').action(async () => {
  await art();
});

program.command('update-info').action(async () => {
  await updateInfo();
});

program
  .command('releases')
  .option(
    '-a --all',
    'all releases, otherwise anything in current year and last'
  )
  .action(async ({ all }) => {
    await releases(all);
  });

program.parse();
