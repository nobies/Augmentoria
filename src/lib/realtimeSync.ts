import { supabase, isSupabaseConfigured, ReviewNote } from './supabase';

export interface SyncEvent {
  type: 'SEEK' | 'PLAY' | 'PAUSE' | 'NOTE_UPSERT' | 'NOTE_DELETE' | 'CONTROL_REQUEST' | 'CONTROL_GRANTED' | 'PRESENCE';
  senderId: string;
  senderName: string;
  time?: number;
  note?: ReviewNote;
  noteId?: string;
  controllerId?: string;
  controllerName?: string;
}

export function createRealtimeSession(
  roomId: string,
  localUserId: string,
  localUserName: string,
  onSyncEvent: (event: SyncEvent) => void
) {
  let channel: any = null;
  let broadcastChannel: BroadcastChannel | null = null;

  // 1. Browser BroadcastChannel for instant local tab-to-tab sync
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(`postflow_sync_${roomId}`);
      broadcastChannel.onmessage = event => {
        if (event.data && event.data.senderId !== localUserId) {
          onSyncEvent(event.data);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // 2. Supabase Realtime Channel (Cloud WebSockets for different devices & networks)
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase.channel(`room_${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: localUserId },
        },
      });

      // Listen for broadcast events
      channel
        .on('broadcast', { event: 'SYNC_ACTION' }, ({ payload }: { payload: SyncEvent }) => {
          if (payload && payload.senderId !== localUserId) {
            onSyncEvent(payload);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            // Track user presence
            await channel.track({
              id: localUserId,
              name: localUserName,
              online_at: new Date().toISOString(),
            });
          }
        });
    } catch (e) {
      console.warn('Supabase Realtime Channel error:', e);
    }
  }

  // Send a synchronization event to all connected peers
  const broadcast = (event: Omit<SyncEvent, 'senderId' | 'senderName'>) => {
    const fullEvent: SyncEvent = {
      ...event,
      senderId: localUserId,
      senderName: localUserName,
    };

    // Send through local BroadcastChannel
    try {
      broadcastChannel?.postMessage(fullEvent);
    } catch (e) {}

    // Send through Supabase Realtime
    if (channel) {
      try {
        channel.send({
          type: 'broadcast',
          event: 'SYNC_ACTION',
          payload: fullEvent,
        });
      } catch (e) {}
    }
  };

  const cleanup = () => {
    try {
      broadcastChannel?.close();
    } catch (e) {}

    if (channel && supabase) {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    }
  };

  return {
    broadcast,
    cleanup,
  };
}
