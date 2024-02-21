import path from 'path';
import update from '@/workflows/update';

const DEST = path.resolve('.', 'test-root');

async function main() {
  return await update(
    path.resolve('.', 'test-root', 'A', 'A vs. Monkey Kong 2'),
    DEST
  );
}

main();
