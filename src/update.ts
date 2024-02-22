import path from 'path';
import update from '@/workflows/update';

async function main() {
  return await update(
    path.resolve('.', 'test-root', 'A', 'A vs. Monkey Kong'),
    path.resolve('.', 'test-root'),
    path.resolve('.', 'test-compressed')
  );
}

main();
