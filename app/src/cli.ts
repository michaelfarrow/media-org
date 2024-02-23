import { Command } from '@commander-js/extra-typings';
import name from '@/commands/name';
import update from '@/commands/update';

const program = new Command();

program
  .name('music-org')
  .description('CLI to some orgnaise music')
  .version('0.1.0');

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

program.parse();
