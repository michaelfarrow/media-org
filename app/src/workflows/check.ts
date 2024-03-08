import path from 'path';
import fs from 'fs-extra';
import { getFileTypes } from '@/lib/fs';
import { input } from '@/lib/ui';
import ffmpeg from '@/lib/ffmpeg';
import { runFfmpegCommand } from '@/lib/audio';

import http from 'http';
import serveStatic from 'serve-static';
import finalhandler from 'finalhandler';

const TEMP_DIR = '.check';

export default async function check(src: string) {
  const files = await getFileTypes(src, ['m4a', 'flac'], { depth: 2 });
  const tempDest = path.resolve(src, TEMP_DIR);

  await fs.ensureDir(tempDest);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    await runFfmpegCommand(
      ffmpeg(file.path).output(
        path.resolve(tempDest, `${i + 1} - ${file.nameWithoutExt}.png`)
      ),
      [
        [
          '-lavfi',
          'showspectrumpic=s=1000x800:mode=separate:start=15k:stop=30k',
        ],
      ]
    );
  }

  // const serve = serveStatic(tempDest, {
  //   setHeaders: (res) => {
  //     res.setHeader('Cache-Control', 'public, max-age=0');
  //   },
  // });

  // const server = http.createServer(function onRequest(req, res) {
  //   serve(req, res, finalhandler(req, res));
  // });

  // console.log(server);

  // server.listen(3333, '0.0.0.0');

  await input('Check files and hit any key to delete');

  await fs.remove(tempDest);
}
