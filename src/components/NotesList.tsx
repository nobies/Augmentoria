'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  Mic,
  Play,
  Pause,
  Filter,
  Check,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { ReviewNote } from '@/lib/supabase';

interface NotesListProps {
  notes: ReviewNote[];
  onSeekToNote: (note: ReviewNote) => void;
  onToggleResolved: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateNoteText: (noteId: string, newText: string) => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  onSeekToNote,
  onToggleResolved,
  onDeleteNote,
  onUpdateNoteText,
}) => {
  const [filterCat, setFilterCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredNotes = notes.filter(n => {
    const matchesCat = filterCat === 'all' || n.category === filterCat;
    const matchesSearch =
      n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.presetLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.timecode.includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  const handleStartEdit = (n: ReviewNote) => {
    setEditingId(n.id);
    setEditText(n.text);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateNoteText(id, editText);
    setEditingId(null);
  };

  const togglePlayAudio = (noteId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    const existingAudio = document.getElementById(`audio-${noteId}`) as HTMLAudioElement | null;
    if (existingAudio) {
      if (playingAudioId === noteId) {
        existingAudio.pause();
        setPlayingAudioId(null);
      } else {
        existingAudio.play();
        setPlayingAudioId(noteId);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header: Search & Category Filter */}
      <div className="p-3.5 border-b border-[#1e273b] bg-[#111724] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Review Notes</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1b2336] text-blue-400 font-bold">
              {notes.length}
            </span>
          </div>

          {/* Quick counts */}
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-slate-400 font-mono">
              {notes.filter(n => n.category === 'editorial').length}
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-500 ml-1" />
            <span className="text-slate-400 font-mono">
              {notes.filter(n => n.category === 'vfx').length}
            </span>
            <span className="w-2 h-2 rounded-full bg-orange-500 ml-1" />
            <span className="text-slate-400 font-mono">
              {notes.filter(n => n.category === 'color').length}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
            <span className="text-slate-400 font-mono">
              {notes.filter(n => n.category === 'sound').length}
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes, presets, timecodes..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090c13] border border-[#1e273b] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {['all', 'editorial', 'vfx', 'color', 'sound'].map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition ${
                filterCat === c
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-[#161e2e] text-slate-400 hover:text-white hover:bg-[#1d273c]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredNotes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
            <Filter className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-semibold">No notes recorded yet</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Select an action key or type a comment while watching to timestamp review notes.
            </p>
          </div>
        ) : (
          filteredNotes.map(n => {
            const catBadgeClass =
              n.category === 'editorial'
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : n.category === 'vfx'
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : n.category === 'color'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

            return (
              <div
                key={n.id}
                onClick={() => onSeekToNote(n)}
                className={`p-3 rounded-xl border transition cursor-pointer group relative flex flex-col gap-2 ${
                  n.isResolved
                    ? 'bg-[#111622]/50 border-[#1a2133] opacity-60'
                    : 'bg-[#131926] border-[#222c42] hover:bg-[#182133] hover:border-[#2e3b59] shadow-md'
                }`}
              >
                {/* Top Row: Timecode, Preset Action, Category, Checkbox */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Timecode Badge (Click to jump) */}
                    <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-[#0b0e16] border border-[#1e273b]">
                      {n.timecode}
                      {n.timecodeOut ? ` → ${n.timecodeOut}` : ''}
                    </span>

                    {/* Preset Action Title */}
                    <span className="text-xs font-bold text-white">{n.presetLabel}</span>

                    {/* Category pill */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border ${catBadgeClass}`}
                    >
                      {n.category}
                    </span>
                  </div>

                  {/* Actions (Resolved toggle, Delete) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleResolved(n.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                      title={n.isResolved ? 'Mark as Open' : 'Mark as Resolved'}
                    >
                      {n.isResolved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 hover:text-white" />
                      )}
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteNote(n.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Comment Text or Inline Edit */}
                {editingId === n.id ? (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-[#0a0d14] border border-blue-500 text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(n.id)}
                      className="p-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs ${
                        n.text ? 'text-slate-200' : 'text-slate-500 italic'
                      } ${n.isResolved ? 'line-through text-slate-500' : ''}`}
                    >
                      {n.text || 'No comment provided'}
                    </p>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleStartEdit(n);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Attachments: Voice Clip Audio Player & Frame Drawing Thumbnail */}
                <div className="flex items-center gap-3 pt-1">
                  {/* Voice Note Player */}
                  {n.audioBlobUrl && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]"
                    >
                      <button
                        onClick={() => togglePlayAudio(n.id, n.audioBlobUrl)}
                        className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition"
                      >
                        {playingAudioId === n.id ? (
                          <Pause className="w-2.5 h-2.5" />
                        ) : (
                          <Play className="w-2.5 h-2.5 ml-0.5" />
                        )}
                      </button>
                      <span className="font-semibold">Voice Note</span>
                      <audio
                        id={`audio-${n.id}`}
                        src={n.audioBlobUrl}
                        onEnded={() => setPlayingAudioId(null)}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Frame Drawing Snapshot */}
                  {n.stillImageUrl && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        setPreviewImage(n.stillImageUrl || null);
                      }}
                      className="relative group/thumb cursor-zoom-in"
                    >
                      <img
                        src={n.stillImageUrl}
                        alt="Frame Snapshot"
                        className="w-16 h-10 object-cover rounded-lg border border-slate-700 hover:border-amber-400 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center rounded-lg transition">
                        <ExternalLink className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Fullscreen Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <img src={previewImage} alt="Full Frame Still" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
