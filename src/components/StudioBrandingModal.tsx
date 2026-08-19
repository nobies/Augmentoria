'use client';

import React, { useState } from 'react';
import { X, Palette, Upload, Check, Sparkles, Building2, Globe, MapPin, Image as ImageIcon } from 'lucide-react';
import { Company } from '@/lib/types';

interface StudioBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: Partial<Company>;
  branding?: {
    name?: string;
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  };
  onSaveBranding: (branding: any) => Promise<void>;
}

export const StudioBrandingModal: React.FC<StudioBrandingModalProps> = ({
  isOpen,
  onClose,
  company,
  branding,
  onSaveBranding,
}) => {
  const initialName = company?.name || branding?.name || 'Studio';
  const initialTagline = company?.tagline || branding?.tagline || 'High-End Post-Production Suite';
  const initialPrimary = company?.brandPrimary || branding?.primaryColor || '#3b82f6';
  const initialSecondary = company?.brandSecondary || branding?.secondaryColor || '#10b981';
  const initialLogo = company?.logoUrl || branding?.logoUrl || '';

  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline);
  const [description, setDescription] = useState(company?.description || '');
  const [website, setWebsite] = useState(company?.website || '');
  const [address, setAddress] = useState(company?.address || '');
  const [brandPrimary, setBrandPrimary] = useState(initialPrimary);
  const [brandSecondary, setBrandSecondary] = useState(initialSecondary);
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        description,
        website,
        address,
        brandPrimary,
        brandSecondary,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 my-8 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#151d2c] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Studio Identity & Workspace Branding</h2>
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {company?.plan || 'pro'} Tier
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customize your studio branding, official logo, and theme colors across review screeners and reports.
            </p>
          </div>
        </div>

        {/* Live Identity Preview Banner */}
        <div className="p-4 rounded-2xl bg-[#06080d] border border-[#1b2438] space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Live Workspace Header Preview
          </span>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0e1422] border border-[#1e293f]">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Studio Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-[#2d3a54]"
                />
              ) : (
                <div
                  style={{ backgroundColor: brandPrimary }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-lg"
                >
                  {name.charAt(0) || 'S'}
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">{name || 'Studio Name'}</h3>
                <p className="text-xs text-slate-400">{tagline || 'Post-Production Suite'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: brandPrimary }}
                className="w-3.5 h-3.5 rounded-full shadow-sm"
                title="Primary Brand Color"
              />
              <span
                style={{ backgroundColor: brandSecondary }}
                className="w-3.5 h-3.5 rounded-full shadow-sm"
                title="Secondary Brand Color"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Studio Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Studio Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Vortex Post Studios"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tagline / Mission</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="e.g. High-End Commercial & VFX Suite"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>Official Website</span>
              </span>
            </label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yourstudio.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
            />
          </div>

          {/* Location / Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Facility Location</span>
              </span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. SoHo, New York / Soho Square, London"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Studio Overview / Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short description of the studio specialties and facility capabilities..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 resize-none transition"
          />
        </div>

        {/* Logo URL and File Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Studio Logo</label>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="url"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="Paste direct Image URL (e.g. https://...)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-blue-500 font-mono transition"
              />
              <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>

            <label className="cursor-pointer shrink-0 w-full sm:w-auto">
              <div className="px-4 py-2.5 rounded-xl border border-[#232f48] bg-[#121927] hover:bg-[#182235] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Upload File</span>
              </div>
              <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Brand Theme Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#182133]">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandPrimary}
                onChange={e => setBrandPrimary(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={brandPrimary}
                onChange={e => setBrandPrimary(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs font-mono text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Secondary Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandSecondary}
                onChange={e => setBrandSecondary(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={brandSecondary}
                onChange={e => setBrandSecondary(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#182133]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#141b29] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-xl transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Apply Studio Branding'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
