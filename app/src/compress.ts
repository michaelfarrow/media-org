import path from 'path';
import compress from '@/workflows/compress';

async function main() {
  return await compress(
    path.resolve('.', 'test-root', 'A', 'A vs. Monkey Kong'),
    path.resolve('.', 'test-compressed')
  );
}

main();
