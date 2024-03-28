import { Command } from '@commander-js/extra-typings';
import name from './commands/name';
import subtitles from './commands/subtitles';
import compress from './commands/compress';
import streams from './commands/streams';

const program = new Command();

program
  .name('movies-org')
  .description('CLI to some orgnaise movies')
  .version('0.1.0');

program
  .command('name')
  .argument('[source]', 'source directory')
  .action(async (src) => {
    await name(src);
  });

program.command('subtitles').action(async () => {
  await subtitles();
});

program.command('compress').action(async () => {
  await compress();
});

program.command('streams').action(async () => {
  await streams();
});

program.parse();
