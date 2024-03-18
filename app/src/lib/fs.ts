import path from 'path';
import klaw from 'klaw';
import { orderBy } from 'natural-orderby';
import axios from 'axios';
import sharp from 'sharp';

export type Item = {
  name: string;
  path: string;
};

export type Dir = Item;
export type File = Item & {
  nameWithoutExt: string;
  ext: string;
  dir: string;
};

export type ItemFilter = (item: klaw.Item) => boolean;
export type Options = {
  filter?: ItemFilter;
  depth?: number | undefined;
  sort?: boolean | 'asc' | 'desc';
};

export const IGNORE_DIRS = ['@eaDir', '.AppleDouble'];

function runFilter(filter: ItemFilter | undefined, item: klaw.Item) {
  return filter ? filter(item) : true;
}

function chainFilter(options: Options = {}, filter: ItemFilter): Options {
  return {
    ...options,
    filter: (item) => {
      return filter(item) && runFilter(options.filter, item);
    },
  };
}

function validDir(item: klaw.Item, root: string) {
  const pathParts = removeRootPath(item.path, root).split(path.sep);
  if (item.stats.isFile()) pathParts.pop();

  for (const ignoreDir of IGNORE_DIRS) {
    if (pathParts.includes(ignoreDir)) return false;
  }

  return true;
}

export function removeRootPath(filePath: string, rootPath: string) {
  const r = path.resolve(rootPath);
  const f = path.resolve(filePath);
  return (f.startsWith(r) ? f.substring(r.length) : f).replace(/^[\/\\]/, '');
}

export function getItems(dir: string, options: Options = {}): Promise<Item[]> {
  return new Promise((resolve, reject) => {
    const items: Item[] = [];
    klaw(dir, { depthLimit: options.depth || 0 })
      .on('data', (item) => {
        if (
          item.path !== path.resolve(dir) &&
          runFilter(options.filter, item) &&
          validDir(item, dir)
        ) {
          items.push({ name: path.basename(item.path), path: item.path });
        }
      })
      .on('end', () => {
        resolve(
          options.sort
            ? orderBy(
                items,
                (item) => item.path,
                options.sort === true ? 'asc' : options.sort
              )
            : items
        );
      })
      .on('error', reject);
  });
}

export function getDirs(dir: string, options?: Options): Promise<Dir[]> {
  return getItems(
    dir,
    chainFilter(options, (item) => item.stats.isDirectory())
  );
}

export async function getFiles(
  dir: string,
  options?: Options
): Promise<File[]> {
  return (
    await getItems(
      dir,
      chainFilter(options, (item) => item.stats.isFile())
    )
  ).map((file) => {
    const parsed = path.parse(file.path);
    return {
      ...file,
      nameWithoutExt: parsed.name,
      ext: parsed.ext.replace(/^\./, ''),
      dir: path.dirname(file.path),
    };
  });
}

export function getFileTypes(
  dir: string,
  ext: string | string[],
  options?: Options
): Promise<File[]> {
  const extensions = [ext].flat();
  return getFiles(
    dir,
    chainFilter(options, (item) => {
      const parsed = path.parse(item.path);
      return extensions.includes(parsed.ext.replace(/^\./, ''));
    })
  );
}

export async function downloadImage(
  src: string,
  dest: string,
  quality: number = 100
) {
  const input = (await axios({ url: src, responseType: 'arraybuffer' })).data;
  await sharp(input).jpeg({ quality }).toFile(dest);
}
