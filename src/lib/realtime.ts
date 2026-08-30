import type { AppState } from './store';
import { supabase } from './supabase';

export type PlaybackAction = 'play' | 'pause' | 'seek' | 'time';

export type ReviewRealtimeMessage =
  | { type: 'welcome'; state?: AppState | null; playback?: PlaybackMessage | null; sequence?: number; serverTime?: number }
  | { type: 'state'; state: AppState; id?: string; senderId?: string; sequence?: number; serverTime?: number }
  | PlaybackMessage
  | { type: 'presence'; participants: string[]; serverTime?: number };

export interface PlaybackMessage {
  type: 'playback';
  action: PlaybackAction;
  time: number;
  sessionId: string;
  id?: string;
  senderId?: string;
  sequence?: number;
  serverTime?: number;
}

interface Options {
  onMessage: (message: ReviewRealtimeMessage) => void;
  onStatus: (connected: boolean, detail?: string) => void;
}

const configuredUrl = import.meta.env.VITE_REALTIME_URL as string | undefined;

function realtimeUrl() {
  if (configuredUrl) return configuredUrl;
  if (!import.meta.env.DEV || typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8787`;
}

export function connectReviewRealtime(roomId: string, clientId: string, options: Options) {
  const seen = new Set<string>();
  const pending: string[] = [];
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`augmentoria-review-${roomId}`);
  const cloudChannel = supabase?.channel(`review:${roomId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: clientId },
    },
  });
  let socket: WebSocket | null = null;
  let latestState: Extract<ReviewRealtimeMessage, { type: 'state' }> | null = null;
  let closed = false;
  let retry: number | null = null;

  const receive = (message: ReviewRealtimeMessage) => {
    if ('id' in message && message.id) {
      if (seen.has(message.id)) return;
      seen.add(message.id);
      if (seen.size > 500) seen.delete(seen.values().next().value as string);
    }
    options.onMessage(message);
  };

  channel?.addEventListener('message', (event) => receive(event.data as ReviewRealtimeMessage));

  cloudChannel
    ?.on('broadcast', { event: 'message' }, ({ payload }) => {
      receive(payload as ReviewRealtimeMessage);
    })
    .on('broadcast', { event: 'sync-request' }, () => {
      if (latestState) {
        void cloudChannel.send({ type: 'broadcast', event: 'message', payload: latestState });
      }
    })
    .on('presence', { event: 'sync' }, () => {
      const participants = Object.values(cloudChannel.presenceState())
        .flat()
        .map((presence) => String((presence as { clientId?: string }).clientId ?? ''))
        .filter(Boolean);
      receive({ type: 'presence', participants: [...new Set(participants)] });
    });

  if (cloudChannel) {
    cloudChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await cloudChannel.track({ clientId, onlineAt: new Date().toISOString() });
        await cloudChannel.send({ type: 'broadcast', event: 'sync-request', payload: { clientId } });
        options.onStatus(true, 'Connected through Supabase Realtime');
        receive({ type: 'welcome', state: null, serverTime: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        options.onStatus(false, `Supabase Realtime ${status.toLowerCase().replace('_', ' ')}`);
      }
    });
  }

  const open = () => {
    const baseUrl = realtimeUrl();
    if (!baseUrl || closed) return;
    const url = new URL(baseUrl);
    url.searchParams.set('room', roomId);
    url.searchParams.set('client', clientId);
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      options.onStatus(true, `Connected to ${url.host}`);
      pending.splice(0).forEach((payload) => socket?.send(payload));
    });
    socket.addEventListener('message', (event) => {
      try {
        receive(JSON.parse(String(event.data)) as ReviewRealtimeMessage);
      } catch {
        // Ignore malformed local-development messages.
      }
    });
    socket.addEventListener('close', (event) => {
      options.onStatus(false, event.reason || `Connection closed (${event.code})`);
      if (!closed) retry = window.setTimeout(open, 1200);
    });
    socket.addEventListener('error', () => {
      options.onStatus(false, `WebSocket error at ${url.host}`);
      socket?.close();
    });
  };
  open();

  return {
    send(message: Extract<ReviewRealtimeMessage, { type: 'state' | 'playback' }>) {
      const envelope = { ...message, id: message.id ?? `${clientId}-${Date.now()}-${Math.random().toString(36).slice(2)}` };
      if (envelope.type === 'state') latestState = envelope;
      const payload = JSON.stringify(envelope);
      channel?.postMessage(envelope);
      if (cloudChannel) void cloudChannel.send({ type: 'broadcast', event: 'message', payload: envelope });
      if (socket?.readyState === WebSocket.OPEN) socket.send(payload);
      else if (realtimeUrl()) pending.splice(0, pending.length, payload);
    },
    close() {
      closed = true;
      if (retry !== null) window.clearTimeout(retry);
      socket?.close();
      channel?.close();
      if (cloudChannel) void supabase?.removeChannel(cloudChannel);
      options.onStatus(false, 'Connection closed');
    },
  };
}
