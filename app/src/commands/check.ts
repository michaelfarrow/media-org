import path from 'path';
import check from '@/workflows/check';

export default async function checkCommand(src?: string) {
  return check(src || path.resolve('.'));
}
