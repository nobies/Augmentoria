import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';

const port = 8798;
const server = spawn(process.execPath, ['scripts/realtime-server.mjs'], {
  env: { ...process.env, AUGMENTORIA_REALTIME_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'inherit']
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect(client) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}?room=smoke-room&client=${client}`);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function nextMessage(socket, type) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 3000);
    const listener = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type !== type) return;
      clearTimeout(timer);
      socket.off('message', listener);
      resolve(message);
    };
    socket.on('message', listener);
  });
}

try {
  await Promise.race([
    new Promise((resolve) => server.stdout.once('data', resolve)),
    wait(3000).then(() => { throw new Error('Realtime server did not start'); })
  ]);
  const first = await connect('first');
  const second = await connect('second');

  const stateReceived = nextMessage(second, 'state');
  first.send(JSON.stringify({ type: 'state', id: 'state-1', state: { projects: [], comments: [], layers: [] } }));
  const state = await stateReceived;
  if (state.senderId !== 'first' || state.sequence !== 1) throw new Error('State envelope is invalid');

  const playbackReceived = nextMessage(second, 'playback');
  first.send(JSON.stringify({ type: 'playback', id: 'play-1', action: 'seek', time: 12.5, sessionId: 'session-1' }));
  const playback = await playbackReceived;
  if (playback.time !== 12.5 || playback.action !== 'seek') throw new Error('Playback envelope is invalid');

  first.close();
  second.close();
  console.log('Realtime smoke test passed');
} finally {
  server.kill('SIGTERM');
}
