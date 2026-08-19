'use client';

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  Play,
  Pause,
  Filter,
  Check,
  Edit2,
  ExternalLink,
  PenTool,
  Film,
  Palette,
  Sparkles,
  User,
} from 'lucide-react';
import { ReviewNote } from '@/lib/supabase';

interface NotesListProps {
  notes: ReviewNote[];
  selectedNoteId: string | null;
  currentAuthorName?: string;
  onChangeAuthorName?: (name: string) => void;
  onSeekToNote: (note: ReviewNote) => void;
  onToggleResolved: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateNoteText: (noteId: string, newText: string) => void;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  selectedNoteId,
  currentAuthorName = 'Reviewer',
  onChangeAuthorName,
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
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [authorInput, setAuthorInput] = useState(currentAuthorName);

  const filteredNotes = notes.filter(n => {
    const matchesCat = filterCat === 'all' || n.category === filterCat;
    const matchesSearch =
      n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.presetLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const handleSaveAuthor = (e: React.FormEvent) => {
    e.preventDefault();
    if (onChangeAuthorName && authorInput.trim()) {
      onChangeAuthorName(authorInput.trim());
    }
    setIsEditingAuthor(false);
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
    <div className="flex flex-col h-full bg-[#0d121c] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl flex-1 min-h-0">
      {/* Top Header: Search & Category Filter */}
      <div className="p-2.5 border-b border-[#1e273b] bg-[#111724] space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Review Notes</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">
              {notes.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {['all', 'editorial', 'vfx', 'color', 'sound'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                  filterCat === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#182133] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Current Reviewer Name Badge & Search input */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search notes, authors, timecodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-xl bg-[#090d14] border border-[#1e273b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Reviewer Name Pill */}
          {isEditingAuthor ? (
            <form onSubmit={handleSaveAuthor} className="flex items-center gap-1">
              <input
                type="text"
                value={authorInput}
                onChange={e => setAuthorInput(e.target.value)}
                className="w-24 px-1.5 py-1 rounded bg-[#090d14] border border-blue-500 text-[10px] text-white focus:outline-none"
                autoFocus
              />
              <button type="submit" className="p-1 rounded bg-blue-600 text-white">
                <Check className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthorInput(currentAuthorName);
                setIsEditingAuthor(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#151c2a] hover:bg-[#1f2a3d] border border-[#232d44] text-[10px] font-bold text-slate-300 transition shrink-0"
              title="Change your reviewer name for comments"
            >
              <User className="w-3 h-3 text-blue-400" />
              <span className="max-w-[70px] truncate">{currentAuthorName}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notes List with Scroll */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-[#1e273b] scrollbar-track-transparent">
        {filteredNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
            <Filter className="w-8 h-8 opacity-30 text-blue-400" />
            <p className="text-xs font-medium">No notes match current filter</p>
          </div>
        ) : (
          filteredNotes.map(n => {
            const isSelected = selectedNoteId === n.id;
            const catBadgeClass =
              n.category === 'editorial'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : n.category === 'vfx'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : n.category === 'color'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                : n.category === 'sound'
                ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/30';

            return (
              <div
                key={n.id}
                onClick={() => onSeekToNote(n)}
                className={`p-2 rounded-xl border transition cursor-pointer group relative flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                    : n.isResolved
                    ? 'bg-[#111622]/40 border-[#1a2133] opacity-60'
                    : 'bg-[#131926] border-[#222c42] hover:bg-[#182133] hover:border-[#2e3b59]'
                }`}
              >
                <div className="flex gap-2 items-start">
                  {/* Thumbnail Still Image */}
                  <div
                    onClick={e => {
                      if (n.stillImageUrl) {
                        e.stopPropagation();
                        setPreviewImage(n.stillImageUrl);
                      }
                    }}
                    className="relative w-16 h-11 rounded-lg bg-[#0b0e16] border border-[#232d44] overflow-hidden shrink-0 group/thumb cursor-zoom-in flex items-center justify-center"
                  >
                    {n.stillImageUrl ? (
                      <img src={n.stillImageUrl} alt="Frame" className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-slate-600" />
                    )}

                    {n.drawingData && (
                      <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-amber-500 text-black text-[8px]" title="Drawing Markup">
                        <PenTool className="w-2 h-2" />
                      </div>
                    )}
                    {n.colorGrade && (
                      <div className="absolute bottom-0.5 left-0.5 p-0.5 rounded bg-purple-600 text-white text-[8px]" title="Color Grade Attached">
                        <Palette className="w-2 h-2" />
                      </div>
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-blue-400 px-1.5 py-0.2 rounded bg-[#0b0e16]">
                          {n.timecode}
                        </span>
                        <span className="text-[11px] font-bold text-white truncate max-w-[90px]">
                          {n.presetLabel}
                        </span>
                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase border ${catBadgeClass}`}>
                          {n.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onToggleResolved(n.id);
                          }}
                          className="p-0.5 rounded text-slate-400 hover:text-emerald-400"
                        >
                          {n.isResolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 hover:text-white" />
                          )}
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteNote(n.id);
                          }}
                          className="p-0.5 rounded text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Comment text */}
                    {editingId === n.id ? (
                      <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 mt-0.5">
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          className="flex-1 px-1.5 py-0.5 rounded bg-[#0a0d14] border border-blue-500 text-[10px] text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(n.id)}
                          className="p-1 rounded bg-blue-600 text-white"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-[11px] leading-tight ${
                            n.text ? 'text-slate-300' : 'text-slate-500 italic'
                          } ${n.isResolved ? 'line-through text-slate-500' : ''}`}
                        >
                          {n.text || 'No comment added'}
                        </p>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleStartEdit(n);
                          }}
                          className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Color Grade Look Badge */}
                    {n.colorGrade && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 text-[9px] mt-0.5 w-fit">
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                        <span className="font-bold">
                          {n.colorGrade.preset !== 'none' ? `Look: ${n.colorGrade.preset}` : 'Color Correction'}
                        </span>
                      </div>
                    )}

                    {/* Audio Note player */}
                    {n.audioBlobUrl && (
                      <div
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[9px] mt-0.5 w-fit"
                      >
                        <button
                          onClick={() => togglePlayAudio(n.id, n.audioBlobUrl)}
                          className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow"
                        >
                          {playingAudioId === n.id ? <Pause className="w-2 h-2" /> : <Play className="w-2 h-2 ml-0.5" />}
                        </button>
                        <span className="font-bold">Voice Note</span>
                        <audio id={`audio-${n.id}`} src={n.audioBlobUrl} onEnded={() => setPlayingAudioId(null)} className="hidden" />
                      </div>
                    )}

                    {/* Author & Timestamp Footer */}
                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1 mt-0.5 border-t border-[#1a2336]/60">
                      <span className="flex items-center gap-1 font-semibold text-slate-400">
                        <User className="w-2.5 h-2.5 text-blue-400" />
                        <span>{n.authorName || 'Reviewer'}</span>
                      </span>
                      {n.createdAt && (
                        <span className="text-[8px] font-mono text-slate-500">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
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
            <img src={previewImage} alt="Full Frame" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
