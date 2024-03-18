import path from 'path';
import name from '../workflows/name';
import { input } from '@/lib/ui';

export default async function nameCommand(src?: string) {
  let _src = src || path.resolve('.');

  if (_src && !_src.startsWith('/')) {
    _src = path.resolve('.', _src);
  }

  let imdbID: string | undefined = undefined;

  const existingId = _src.match(/(tt\d+)/i);
  console.log(_src, existingId);

  if (existingId) imdbID = existingId[0].toLowerCase().trim();

  if (!imdbID) imdbID = (await input('IMDb id:')).trim();

  if (!imdbID.length) {
    console.log('No id specified');
    return;
  }

  return await name(_src, imdbID);
}
