import path from 'path';
import fs from 'fs-extra';
import WebTorrent from 'webtorrent';
import { sha256 } from '@/lib/hash';
import { getFileTypes } from '@/lib/fs';
import { wait } from '@/lib/time';

const DEST_ROOT = path.resolve('.', '.torrent');
const DEST_TORRENTS = path.resolve(DEST_ROOT, 'torrents');
const DEST_DOWNLOAD = path.resolve(DEST_ROOT, 'download');

const EXT_MAGNET = 'magnet';

export type Torrent = WebTorrent.Torrent;

export interface Options {
  update?: (torrents: Torrent[]) => any;
}

export async function initTorrentClient(options: Options = {}) {
  const { update = () => {} } = options;

  await fs.ensureDir(DEST_ROOT);
  await fs.ensureDir(DEST_TORRENTS);
  await fs.ensureDir(DEST_DOWNLOAD);

  const client = new WebTorrent();

  const callUpdate = () => {
    update(client.torrents);
  };

  client.on('torrent', async (torrent) => {
    callUpdate();

    console.log('Torrent', torrent.name);

    torrent.on('done', callUpdate);
    torrent.on('download', callUpdate);

    // console.log(path.resolve(torrent.path, torrent.name));
    const magnetUri = torrent.magnetURI;
    const hashedFilename = sha256(magnetUri);
    const dest = path.resolve(DEST_TORRENTS, `${hashedFilename}.${EXT_MAGNET}`);

    await fs.outputFile(dest, magnetUri);
  });

  client.on('error', (e) => {
    console.log(e);
  });

  function add(magnetUri: string) {
    console.log('Add', magnetUri);
    client.add(magnetUri, { path: DEST_DOWNLOAD });
  }

  await wait(5000);

  const torrentFiles = await getFileTypes(DEST_TORRENTS, EXT_MAGNET);
  for (const file of torrentFiles) {
    console.log('Loading', file.name);
    const magnetUri = (await fs.readFile(file.path, 'utf-8')).trim();
    add(magnetUri);
  }

  return {
    add,
  };
}
