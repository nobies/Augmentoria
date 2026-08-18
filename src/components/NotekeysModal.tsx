'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { CategoryPreset } from './PresetKeys';

interface NotekeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryPreset[];
  onSaveCategories: (categories: CategoryPreset[]) => void;
}

const COLOR_SWATCHES = [
  { id: 'editorial', bg: '#ef4444', label: 'Red' },
  { id: 'vfx', bg: '#3b82f6', label: 'Blue' },
  { id: 'sound', bg: '#10b981', label: 'Green' },
  { id: 'color', bg: '#f59e0b', label: 'Yellow/Orange' },
  { id: 'purple', bg: '#a855f7', label: 'Purple' },
  { id: 'pink', bg: '#ec4899', label: 'Pink' },
];

export const NotekeysModal: React.FC<NotekeysModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
}) => {
  const [cats, setCats] = useState<CategoryPreset[]>(categories);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'editorial');
  const [newKeyName, setNewKeyName] = useState('');

  if (!isOpen) return null;

  const currentCat = cats.find(c => c.id === selectedCatId) || cats[0];

  const handleUpdateCatName = (newName: string) => {
    setCats(prev =>
      prev.map(c => (c.id === currentCat.id ? { ...c, name: newName } : c))
    );
  };

  const handleUpdateCatColor = (colorId: any) => {
    setCats(prev =>
      prev.map(c => (c.id === currentCat.id ? { ...c, color: colorId } : c))
    );
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCats(prev =>
      prev.map(c =>
        c.id === currentCat.id
          ? { ...c, keys: [...c.keys, newKeyName.trim()] }
          : c
      )
    );
    setNewKeyName('');
  };

  const handleDeleteKey = (keyIndex: number) => {
    setCats(prev =>
      prev.map(c =>
        c.id === currentCat.id
          ? { ...c, keys: c.keys.filter((_, idx) => idx !== keyIndex) }
          : c
      )
    );
  };

  const handleAddPage = () => {
    const newId = `page_${Date.now()}`;
    const newPage: CategoryPreset = {
      id: newId,
      name: 'Custom Page',
      color: 'editorial',
      icon: null as any,
      keys: ['Flag', 'Note 1', 'Review'],
    };
    setCats(prev => [...prev, newPage]);
    setSelectedCatId(newId);
  };

  const handleDeletePage = (pageId: string) => {
    if (cats.length <= 1) return;
    const remaining = cats.filter(c => c.id !== pageId);
    setCats(remaining);
    setSelectedCatId(remaining[0].id);
  };

  const handleResetAll = () => {
    // Default categories
    window.location.reload();
  };

  const handleSaveAndClose = () => {
    onSaveCategories(cats);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#20293d] pb-4 mb-4">
          <h2 className="text-sm font-black tracking-widest uppercase text-white">NOTEKEYS</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: PAGES */}
          <div className="md:col-span-5 flex flex-col gap-3 border-r border-[#20293d] pr-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">PAGES</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="px-2 py-1 rounded-lg bg-[#161f30] hover:bg-[#1f2c45] text-slate-300 text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset all</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="px-2 py-1 rounded-lg bg-[#161f30] hover:bg-[#1f2c45] text-slate-300 text-[10px] font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Pages List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {cats.map(c => {
                const isSelected = selectedCatId === c.id;
                const dotColor =
                  c.color === 'editorial'
                    ? '#ef4444'
                    : c.color === 'vfx'
                    ? '#3b82f6'
                    : c.color === 'color'
                    ? '#f59e0b'
                    : '#10b981';

                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedCatId(c.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition ${
                      isSelected
                        ? 'bg-[#182338] border-blue-500 text-white shadow'
                        : 'bg-[#141b29] border-[#222c42] text-slate-300 hover:bg-[#1a2336] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{c.keys.length}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: EDIT PAGE & KEYS */}
          <div className="md:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
              EDIT &quot;{currentCat?.name}&quot;
            </span>

            {/* Page Name Input */}
            <input
              type="text"
              value={currentCat?.name || ''}
              onChange={e => handleUpdateCatName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs font-bold text-white focus:outline-none focus:border-blue-500"
            />

            {/* Color Swatches */}
            <div className="flex items-center gap-2.5 my-1">
              {COLOR_SWATCHES.map(sw => (
                <button
                  type="button"
                  key={sw.id}
                  onClick={() => handleUpdateCatColor(sw.id)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    currentCat?.color === sw.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: sw.bg }}
                />
              ))}
            </div>

            {/* Reset / Delete Page Buttons */}
            <div className="flex items-center justify-end gap-2 pb-2 border-b border-[#20293d]">
              <button
                type="button"
                onClick={() => handleDeletePage(currentCat.id)}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-bold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete page</span>
              </button>
            </div>

            {/* KEYS Sub-section */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">KEYS</span>
            </div>

            {/* Add Key Input */}
            <form onSubmit={handleAddKey} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="New key name..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#090d14] border border-[#232d44] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#161f30] hover:bg-blue-600 hover:text-white border border-[#263552] text-xs font-bold text-slate-200 flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add key</span>
              </button>
            </form>

            {/* Keys List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[140px] max-h-[220px]">
              {currentCat?.keys.map((k, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] flex items-center justify-between text-xs font-bold text-slate-200 group"
                >
                  <span>{k}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(idx)}
                    className="text-slate-500 hover:text-red-400 p-0.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#20293d] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            Save Notekeys
          </button>
        </div>
      </div>
    </div>
  );
};
