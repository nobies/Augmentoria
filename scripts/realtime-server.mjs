import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const port = Number(process.env.AUGMENTORIA_REALTIME_PORT || 8787);
const rooms = new Map();

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    response.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: [...rooms.values()].reduce((total, room) => total + room.clients.size, 0),
    }));
    return;
  }
  response.writeHead(404);
  response.end();
});

const sockets = new WebSocketServer({ server, maxPayload: 8 * 1024 * 1024 });

function roomFor(id) {
  let room = rooms.get(id);
  if (!room) {
    room = { clients: new Map(), state: null, playback: null, sequence: 0 };
    rooms.set(id, room);
  }
  return room;
}

function send(socket, payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function broadcast(room, payload, except) {
  for (const socket of room.clients.keys()) {
    if (socket !== except) send(socket, payload);
  }
}

function publishPresence(room) {
  const participants = [...new Set(room.clients.values())];
  broadcast(room, { type: 'presence', participants, serverTime: Date.now() });
}

function activeSession(state, roomId) {
  if (!state || !Array.isArray(state.sessions)) return null;
  return state.sessions.find((session) => !session.endedAt && `${session.projectId}-${session.version}` === roomId) ?? null;
}

function matchingSession(state, sessionId) {
  if (!state || !Array.isArray(state.sessions)) return null;
  return state.sessions.find((session) => session.id === sessionId) ?? null;
}

sockets.on('connection', (socket, request) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const roomId = url.searchParams.get('room');
  const clientId = url.searchParams.get('client');
  if (!roomId || !clientId) {
    socket.close(1008, 'room and client are required');
    return;
  }

  const room = roomFor(roomId);
  room.clients.set(socket, clientId);
  send(socket, { type: 'welcome', state: room.state, playback: room.playback, sequence: room.sequence, serverTime: Date.now() });
  publishPresence(room);

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (!message || !['state', 'playback'].includes(message.type)) return;
      room.sequence += 1;
      const envelope = { ...message, senderId: clientId, sequence: room.sequence, serverTime: Date.now() };
      if (message.type === 'state') {
        const currentSession = activeSession(room.state, roomId);
        const incomingSession = activeSession(message.state, roomId);
        if (currentSession && !incomingSession) {
          const ended = matchingSession(message.state, currentSession.id);
          if (!ended?.endedAt) return;
          room.state = null;
        } else {
          room.state = incomingSession ? message.state : null;
        }
      }
      if (message.type === 'playback') room.playback = envelope;
      broadcast(room, envelope, socket);
    } catch {
      // Ignore malformed local-development messages.
    }
  });

  socket.on('close', () => {
    room.clients.delete(socket);
    if (room.clients.size === 0) rooms.delete(roomId);
    else publishPresence(room);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Augmentoria realtime ready on ws://0.0.0.0:${port}`);
});
