import WebSocket, { WebSocketServer } from 'ws';

export const PORT = 8080;
export const PING_INTERVAL = 30000;

export type MessagesConfig = { [key: string]: any };

interface ServerWebSocket extends WebSocket {
  isAlive?: boolean;
}

class ClientWebsocket<T extends MessagesConfig> extends WebSocket {
  pingTimeout?: ReturnType<typeof setTimeout>;
  receive<K extends keyof T>(type: K, handler: (data: T[K]) => void) {
    this.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === type) handler(parsed.data);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

class WebSocketServerEnhanced<
  T extends MessagesConfig
> extends WebSocketServer {
  sendTo<K extends keyof T>(client: WebSocket, type: K, data: T[K]) {
    client.send(JSON.stringify({ type, data }));
  }
  sendToAll<K extends keyof T>(type: K, data: T[K]) {
    this.clients.forEach((client) => {
      this.sendTo(client, type, data);
    });
  }
}

export function initWebSocketServer<T extends MessagesConfig>() {
  const server = new WebSocketServerEnhanced<T>({ port: 8080 });

  server.on('connection', function connection(ws: ServerWebSocket) {
    function heartbeat() {
      ws.isAlive = true;
    }

    ws.isAlive = true;
    ws.on('error', console.error);
    ws.on('pong', heartbeat);
  });

  const interval = setInterval(function ping() {
    server.clients.forEach((ws: ServerWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, PING_INTERVAL);

  server.on('close', function close() {
    clearInterval(interval);
  });

  return server;
}

export function initWebSocketClient<T extends MessagesConfig>() {
  const client = new ClientWebsocket<T>(`ws://localhost:${PORT}`);

  function heartbeat() {
    clearTimeout(client.pingTimeout);

    // Use `WebSocket#terminate()`, which immediately destroys the connection,
    // instead of `WebSocket#close()`, which waits for the close timer.
    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    client.pingTimeout = setTimeout(() => {
      client.terminate();
    }, PING_INTERVAL + 1000);
  }

  client.on('error', console.error);
  client.on('open', heartbeat);
  client.on('ping', heartbeat);
  client.on('close', () => {
    clearTimeout(client.pingTimeout);
  });

  return client;
}

export { WebSocket };
