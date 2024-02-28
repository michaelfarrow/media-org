import { Command } from '@commander-js/extra-typings';
import check from '@/commands/check';
import name from '@/commands/name';
import update from '@/commands/update';
import integrity from '@/commands/integrity';

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

program.command('integrity').action(async () => {
  await integrity();
});

program.parse();
