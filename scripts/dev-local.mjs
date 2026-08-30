import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const realtime = spawn(process.execPath, ['scripts/realtime-server.mjs'], { stdio: 'inherit' });
const vite = spawn(npm, ['run', 'dev', '--', '--host', '0.0.0.0'], { stdio: 'inherit', shell: process.platform === 'win32' });

function stop(signal = 'SIGTERM') {
  realtime.kill(signal);
  vite.kill(signal);
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

const exitCodes = await Promise.all([
  new Promise((resolve) => realtime.on('exit', (code) => resolve(code ?? 0))),
  new Promise((resolve) => vite.on('exit', (code) => resolve(code ?? 0))),
]);

stop();
process.exit(exitCodes.find((code) => code !== 0) ?? 0);
