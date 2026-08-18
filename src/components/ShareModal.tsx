'use client';

import React, { useState } from 'react';
import { X, Share2, Copy, Check, Shield, Eye, Globe, ExternalLink } from 'lucide-react';
import { Project, Cut, ReviewNote, StudioBranding } from '@/lib/supabase';

export interface SharePermissions {
  canComment: boolean;
  canDraw: boolean;
  canGrade: boolean;
  canVoice: boolean;
  canExport: boolean;
  viewOnly: boolean;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  cut: Cut;
  notes?: ReviewNote[];
  branding?: StudioBranding;
}

// Browser-safe URL-safe base64 encoder with UTF-8 support
function encodeToken(obj: any): string {
  try {
    const jsonStr = JSON.stringify(obj);
    const encoded = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(encoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return 'token_error';
  }
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  project,
  cut,
  notes = [],
  branding,
}) => {
  const [permissions, setPermissions] = useState<SharePermissions>({
    canComment: true,
    canDraw: true,
    canGrade: true,
    canVoice: true,
    canExport: true,
    viewOnly: false,
  });

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Fully portable self-contained payload that works across any browser (Chrome, Edge, Safari, Mobile)
  const payload = {
    projectId: project.id,
    cutId: cut.id,
    project: {
      id: project.id,
      name: project.name,
      fps: project.fps,
      dropFrame: project.dropFrame,
      startTimecode: project.startTimecode,
    },
    cut: {
      id: cut.id,
      projectId: cut.projectId,
      name: cut.name,
      provider: cut.provider,
      videoUrl: cut.videoUrl,
      videoUrlB: cut.videoUrlB,
      durationSeconds: cut.durationSeconds,
    },
    notes: (notes || []).map(n => ({
      id: n.id,
      cutId: n.cutId,
      category: n.category,
      presetLabel: n.presetLabel,
      text: n.text,
      frameNumber: n.frameNumber,
      timecode: n.timecode,
      timecodeOut: n.timecodeOut,
      frameOut: n.frameOut,
      drawingData: n.drawingData,
      colorGrade: n.colorGrade,
      stillImageUrl: n.stillImageUrl,
      authorName: n.authorName,
      isResolved: n.isResolved,
    })),
    branding: branding || { name: 'Studio', tagline: 'Post-Production Suite' },
    p: permissions,
    created: Date.now(),
  };

  const shareToken = encodeToken(payload);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const shareUrl = `${origin}/review/${shareToken}`;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const togglePermission = (key: keyof SharePermissions) => {
    if (key === 'viewOnly') {
      const nextViewOnly = !permissions.viewOnly;
      setPermissions({
        canComment: !nextViewOnly,
        canDraw: !nextViewOnly,
        canGrade: !nextViewOnly,
        canVoice: !nextViewOnly,
        canExport: !nextViewOnly,
        viewOnly: nextViewOnly,
      });
      return;
    }

    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
      viewOnly: false,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Share Review Link</h2>
            <p className="text-xs text-slate-400">
              Passwordless magic link for clients & reviewers. Works across all browsers and devices.
            </p>
          </div>
        </div>

        {/* Link Box */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Client Review URL</span>
            </span>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Test Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs font-mono text-slate-300 focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition active:scale-95 shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Role & Permissions Configuration */}
        <div className="p-4 bg-[#141b29] rounded-xl border border-[#222c42] space-y-3 mb-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e273b]">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Client Permissions
            </span>
            <span className="text-[10px] text-slate-400">No login required</span>
          </div>

          <div className="space-y-2">
            {/* View Only Master Toggle */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-[#0d121c] border border-[#1e273b] cursor-pointer hover:border-slate-600 transition">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-xs font-bold text-white block">View-Only Mode</span>
                  <span className="text-[10px] text-slate-400">Strict presentation mode (disable all markup tools)</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={permissions.viewOnly}
                onChange={() => togglePermission('viewOnly')}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
            </label>

            {/* Granular Permission Checkboxes */}
            {[
              { id: 'canComment', label: 'Can Add Comments', desc: 'Allow typing notes & preset stamping' },
              { id: 'canDraw', label: 'Can Draw on Frames', desc: 'Allow freeze-frame markup & drawings' },
              { id: 'canGrade', label: 'Can Color Grade', desc: 'Allow color adjustments & look proposals' },
              { id: 'canVoice', label: 'Can Record Voice Notes', desc: 'Allow audio comment recording' },
              { id: 'canExport', label: 'Can Export Reports', desc: 'Allow downloading PDF & EDL reports' },
            ].map(p => (
              <label
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                  permissions.viewOnly
                    ? 'opacity-40 pointer-events-none bg-[#090d14] border-transparent'
                    : 'bg-[#0d121c] border-[#1e273b] hover:border-slate-600'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{p.label}</span>
                  <span className="text-[10px] text-slate-500">{p.desc}</span>
                </div>
                <input
                  type="checkbox"
                  disabled={permissions.viewOnly}
                  checked={permissions[p.id as keyof SharePermissions] as boolean}
                  onChange={() => togglePermission(p.id as keyof SharePermissions)}
                  className="w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1a2233] hover:bg-[#25324d] text-xs font-bold text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
