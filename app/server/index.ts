import path from 'path';
import { Torrent, initTorrentClient } from '@server/lib/torrent';
import { getFileTypes, removeRootPath } from '@server/lib/fs';
import {
  PORT as WSS_PORT,
  initWebSocketServer,
  initWebSocketClient,
} from '@server/lib/websocket';
import { throttle } from 'throttle-debounce';
import { initApi } from '@server/api';
import { initCron } from '@server/cron';

type Status = { torrents: { name: string; progress: number }[] };

type MessageTypes = {
  update: Status;
};

export async function main() {
  const api = initApi();

  const wss = initWebSocketServer<MessageTypes>();

  // wss.on('connection', (client) => {
  //   wss.sendTo(client, 'update', status);
  // });

  // const ws = initWebSocketClient<MessageTypes>();

  // ws.receive('update', (data) => {
  //   console.log('update', data.torrents);
  // });

  // console.log(`Web socket server is running on port ${WSS_PORT}.`);

  // let status: Status = { torrents: [] };

  // const torrentClient = await initTorrentClient({
  //   update(torrents) {
  //     status = {
  //       torrents: torrents.map((torrent) => {
  //         const { name, progress } = torrent;
  //         return { name, progress };
  //       }),
  //     };
  //     updateClients();
  //   },
  // });

  // const updateClients = throttle(500, () => {
  //   wss.sendToAll('update', status);
  // });

  // app.get('/');

  // app.get('/', (req, res) => {
  //   torrentClient.add(
  //     'magnet:?xt=urn:btih:5495F0231B517B0F904A5F805A8CCC86B0CC74AA&tr=http%3A%2F%2Fbt4.t-ru.org%2Fann%3Fmagnet&dn=(Indie%20Rock)%20%5BWEB%5D%20Bloc%20Party%20-%20Little%20Thoughts%20EP%20-%202004%2C%20FLAC%20(tracks)%2C%20lossless'
  //   );
  //   res.status(200).json({ test: 'yay' });
  // });

  // torrentClient.add(
  //   'magnet:?xt=urn:btih:65121D786846B6D4892DBB9941445C76A0163804&tr=http%3A%2F%2Fbt2.t-ru.org%2Fann%3Fmagnet&dn=(Alt.%20Rock%20%2F%20Electronic)%20%5BCD%5D%20Angels%20%26%20Airwaves%20-%20Lifeforms%20-%202021%2C%20FLAC%20(tracks%2B.cue)%2C%20lossless'
  // );

  // torrentClient.add('65121d786846b6d4892dbb9941445c76a0163804');
  // initCron();
}

main();
