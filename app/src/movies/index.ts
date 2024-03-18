import { Command } from '@commander-js/extra-typings';
import name from './commands/name';
import subtitles from './commands/subtitles';

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

program.parse();
