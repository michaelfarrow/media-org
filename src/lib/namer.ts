export function itemName(str: string, dir?: boolean) {
  return dir ? str.replace(/[\/\.:\$]/g, '_') : str.replace(/[\/:\$]/g, '_');
}

export function dirName(str: string) {
  return itemName(str, true);
}

export function fileName(str: string) {
  return itemName(str);
}

async function getFiles() {
  const items = [];

  return new Promise((resolve, reject) => {
    klaw('.', { depthLimit: 1 })
      .on('data', (item) => {
        if (item.path.endsWith('.m4a')) {
          const dirPath = path.dirname(item.path);
          const filename = path.basename(item.path);
          const name = path.basename(item.path, path.extname(item.path));
          let group = dirPath.substring(path.resolve('.').length);
          const discNumber = name.match(/^(\d+)-\d+/);
          if (group === '' && discNumber) {
            group = discNumber[1];
          }
          if (!items.find((item) => item.group === group))
            items.push({ group, items: [] });
          items
            .find((item) => item.group === group)
            .items.push({
              ...item,
              name,
              filename,
            });
        }
      })
      .on('end', () => {
        resolve(
          orderBy(items, (item) => item.group).map((item) => ({
            ...item,
            items: orderBy(item.items, (item) => item.name),
          }))
        );
      })
      .on('error', reject);
  });
}

export function processDir(dir: string) {
  const files = await getFiles();
}
