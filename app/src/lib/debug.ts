import { inspect } from 'util';

export function log(...o: any[]) {
  console.log(inspect(o, { depth: 10000, colors: true }));
}
