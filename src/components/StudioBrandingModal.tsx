'use client';

import React, { useState } from 'react';
import { X, Palette, Upload, Check, Sparkles } from 'lucide-react';
import { StudioBranding } from '@/lib/supabase';

interface StudioBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: StudioBranding;
  onSaveBranding: (branding: StudioBranding) => Promise<void>;
}

export const StudioBrandingModal: React.FC<StudioBrandingModalProps> = ({
  isOpen,
  onClose,
  branding,
  onSaveBranding,
}) => {
  const [name, setName] = useState(branding.name || 'Studio');
  const [tagline, setTagline] = useState(branding.tagline || 'Post-Production Suite');
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || '#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState(branding.secondaryColor || '#10b981');
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveBranding({
        name,
        tagline,
        primaryColor,
        secondaryColor,
        logoUrl,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Studio Identity & Branding
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Studio Bundle
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Set your studio brand once to apply across all tools and exported reports automatically.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Studio Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Studio Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Framehouse Post, Redline Studios"
              className="w-full px-3 py-2 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline / Department</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. Editorial & Color Grading Suite"
              className="w-full px-3 py-2 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Studio Logo</label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="w-16 h-16 rounded-xl bg-[#171f30] border border-[#242f48] p-2 flex items-center justify-center relative group">
                  <img src={logoUrl} alt="Studio Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    onClick={() => setLogoUrl('')}
                    className="absolute inset-0 bg-black/60 rounded-xl text-xs text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#171f30] border border-dashed border-[#2b3752] flex items-center justify-center text-slate-500">
                  <Palette className="w-6 h-6" />
                </div>
              )}

              <label className="flex-1 cursor-pointer">
                <div className="px-4 py-2.5 rounded-xl border border-[#26334d] bg-[#171f30] hover:bg-[#1f2a40] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>{logoUrl ? 'Change Logo Image' : 'Upload Studio Logo (PNG/SVG)'}</span>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#171f30] border border-[#242f48] text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={e => setSecondaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#171f30] border border-[#242f48] text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#232d44] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Saving Brand...' : 'Save Studio Brand'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
