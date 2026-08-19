import { supabase, isSupabaseConfigured, ReviewNote } from './supabase';
import { getNotesForCut } from './storage';

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
  cutId: string,
  projectId: string,
  localUserId: string,
  localUserName: string,
  onSyncEvent: (event: SyncEvent) => void,
  onNotesRefresh?: (notes: ReviewNote[]) => void
) {
  let channel: any = null;
  let broadcastChannel: BroadcastChannel | null = null;
  let pollingInterval: any = null;

  // 1. Browser BroadcastChannel for instant local tab-to-tab sync
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(`postflow_sync_${cutId}`);
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
      // Room channel for playhead broadcast + presence
      channel = supabase.channel(`room_${cutId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: localUserId },
        },
      });

      // A) Listen for live Broadcast actions (SEEK, PLAY, PAUSE, NOTES)
      channel
        .on('broadcast', { event: 'SYNC_ACTION' }, ({ payload }: { payload: SyncEvent }) => {
          if (payload && payload.senderId !== localUserId) {
            onSyncEvent(payload);
          }
        })
        // B) Listen for direct Postgres Database Changes on 'notes' table
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
          },
          (payload: any) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const d = payload.new;
              if (d && (d.cut_id === cutId || !cutId)) {
                const note: ReviewNote = {
                  id: d.id,
                  cutId: d.cut_id,
                  category: d.category,
                  presetLabel: d.preset_label,
                  text: d.text || '',
                  frameNumber: Number(d.frame_number) || 0,
                  timecode: d.timecode,
                  timecodeOut: d.timecode_out,
                  frameOut: d.frame_out ? Number(d.frame_out) : undefined,
                  drawingData: d.drawing_data,
                  colorGrade: d.color_grade,
                  stillImageUrl: d.still_image_url,
                  audioBlobUrl: d.audio_url,
                  authorName: d.author_name || 'Reviewer',
                  isResolved: Boolean(d.is_resolved),
                  createdAt: d.created_at,
                };
                onSyncEvent({
                  type: 'NOTE_UPSERT',
                  senderId: 'supabase_db',
                  senderName: note.authorName,
                  note,
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const d = payload.old;
              if (d?.id) {
                onSyncEvent({
                  type: 'NOTE_DELETE',
                  senderId: 'supabase_db',
                  senderName: 'System',
                  noteId: d.id,
                });
              }
            }
          }
        )
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
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

    // 3. Fallback High-Frequency Silent Background Sync (Every 2 seconds)
    // Guarantees updates appear even if WebSocket connection is interrupted
    if (cutId && onNotesRefresh) {
      pollingInterval = setInterval(async () => {
        try {
          const latestNotes = await getNotesForCut(cutId);
          if (latestNotes && latestNotes.length >= 0) {
            onNotesRefresh(latestNotes);
          }
        } catch (e) {}
      }, 2000);
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
    if (pollingInterval) clearInterval(pollingInterval);
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
