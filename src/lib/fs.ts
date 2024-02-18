import path, { parse } from 'path';
import klaw from 'klaw';

export type Item = {
  name: string;
  path: string;
};

export type Dir = Item;
export type File = Item;

export type ItemFilter = (item: klaw.Item) => boolean;
export type Options = {
  filter?: ItemFilter;
  depthLimit?: number | undefined;
};

export const IGNORE_DIRS = ['@eaDir'];
export const DEFAULT_FILTER: ItemFilter = () => true;

export function getItems(dir: string, options: Options = {}): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const items: Item[] = [];
    klaw(dir, { depthLimit: 0 })
      .on('data', (item) => {
        if (item.path !== path.resolve(dir) && filter(item)) {
          items.push({ name: path.basename(item.path), path: item.path });
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', reject);
  });
}

export function getDirs(dir: string, options: Options = {}): Promise<Dir[]> {
  return getItems(
    dir,
    (item) =>
      item.stats.isDirectory() &&
      !IGNORE_DIRS.includes(path.basename(item.path)) &&
      (options.filter || DEFAULT_FILTER)(item)
  );
}

export function getFiles(dir: string, options: Options = {}): Promise<File[]> {
  return getItems(
    dir,
    (item) => item.stats.isFile() && (options.filter || DEFAULT_FILTER)(item)
  );
}

export function getFileTypes(
  dir: string,
  ext: string | string[],
  options: Options = {}
): Promise<File[]> {
  const extensions = [ext].flat();
  return getFiles(dir, {
    ...options,
    filter: (item) => {
      const parsed = path.parse(item.path);
      return (
        extensions.includes(parsed.ext) &&
        (options.filter || DEFAULT_FILTER)(item)
      );
    },
  });
}
