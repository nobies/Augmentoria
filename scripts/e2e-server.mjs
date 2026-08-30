import { spawn } from 'node:child_process';

const env = { ...process.env, AUGMENTORIA_REALTIME_PORT: '8799', VITE_REALTIME_URL: 'ws://127.0.0.1:8799' };
const realtime = spawn(process.execPath, ['scripts/realtime-server.mjs'], { env, stdio: 'inherit' });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173'], { env, stdio: 'inherit' });

function stop(signal = 'SIGTERM') {
  realtime.kill(signal);
  vite.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

const exitCodes = await Promise.all([
  new Promise((resolve) => realtime.on('exit', (code) => resolve(code ?? 0))),
  new Promise((resolve) => vite.on('exit', (code) => resolve(code ?? 0)))
]);

stop();
process.exit(exitCodes.find((code) => code !== 0) ?? 0);
