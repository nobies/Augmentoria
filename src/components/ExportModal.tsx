'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Film,
  Sparkles,
  Check,
  Share2,
} from 'lucide-react';
import { Project, Cut, ReviewNote, StudioBranding } from '@/lib/supabase';
import {
  generateEDL,
  generateSRT,
  generatePremiereCSV,
  generateCSV,
  generateTextSummary,
  generatePDFReport,
} from '@/lib/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  cut: Cut;
  notes: ReviewNote[];
  branding: StudioBranding;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  cut,
  notes,
  branding,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'edl' | 'srt' | 'premiere' | 'csv' | 'txt'>('pdf');
  const [srtDuration, setSrtDuration] = useState(50);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setGenerating(true);
    const baseName = `${project.name.replace(/\s+/g, '_')}_${cut.name.replace(/\s+/g, '_')}_ReviewNotes`;

    try {
      if (selectedFormat === 'pdf') {
        const pdfBlob = await generatePDFReport(project, cut, notes, branding);
        downloadFile(pdfBlob, `${baseName}.pdf`);
      } else if (selectedFormat === 'edl') {
        const edlContent = generateEDL(project, cut, notes);
        const blob = new Blob([edlContent], { type: 'text/plain;charset=utf-8' });
        downloadFile(blob, `${baseName}.edl`);
      } else if (selectedFormat === 'srt') {
        const srtContent = generateSRT(project, notes, srtDuration);
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        downloadFile(blob, `${baseName}.srt`);
      } else if (selectedFormat === 'premiere') {
        const pContent = generatePremiereCSV(notes);
        const blob = new Blob([pContent], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, `${baseName}_PremiereMarkers.csv`);
      } else if (selectedFormat === 'csv') {
        const csvContent = generateCSV(project, cut, notes);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        downloadFile(blob, `${baseName}.csv`);
      } else if (selectedFormat === 'txt') {
        const txtContent = generateTextSummary(project, cut, notes);
        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
        downloadFile(blob, `${baseName}.txt`);
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const formats = [
    {
      id: 'pdf',
      name: 'Branded PDF Report',
      badge: 'Studio',
      desc: 'Visual document with studio identity, client branding, timestamps, and drawings.',
      icon: Sparkles,
    },
    {
      id: 'edl',
      name: 'EDL (CMX 3600)',
      badge: 'NLE',
      desc: 'LOC timeline marker lines for DaVinci Resolve and Avid Media Composer.',
      icon: Film,
    },
    {
      id: 'srt',
      name: 'SRT Subtitles',
      badge: 'Captions',
      desc: 'Each note timed as an on-screen subtitle track for Premiere, FCPX, or VLC.',
      icon: FileText,
    },
    {
      id: 'premiere',
      name: 'Premiere Pro Marker CSV',
      badge: 'Premiere',
      desc: 'Direct marker track import for Adobe Premiere Pro.',
      icon: FileSpreadsheet,
    },
    {
      id: 'csv',
      name: 'CSV Spreadsheet',
      badge: 'Data',
      desc: 'Structured tabular data for Excel, Google Sheets, or Notion.',
      icon: FileSpreadsheet,
    },
    {
      id: 'txt',
      name: 'Plain Text Summary',
      badge: 'Text',
      desc: 'Clean markdown log for Slack, email, or client delivery notes.',
      icon: FileText,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Export Review Notes</h2>
            <p className="text-xs text-slate-400">
              Export {notes.length} notes for &quot;{project.name}&quot; ({cut.name})
            </p>
          </div>
        </div>

        {/* Formats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5">
          {formats.map(f => {
            const FIcon = f.icon;
            const isSelected = selectedFormat === f.id;
            return (
              <div
                key={f.id}
                onClick={() => setSelectedFormat(f.id as any)}
                className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                    : 'bg-[#151c2a] border-[#222c42] text-slate-300 hover:bg-[#1c2538]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FIcon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold">{f.name}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1e273b] text-slate-400 uppercase">
                    {f.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight mt-1">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Format Specific Settings */}
        {selectedFormat === 'srt' && (
          <div className="p-3 bg-[#161e2e] border border-[#26334d] rounded-xl mb-5 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Subtitle duration per note:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="10"
                max="250"
                value={srtDuration}
                onChange={e => setSrtDuration(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded bg-[#0e1420] border border-[#2a3754] text-white font-mono text-center text-xs"
              />
              <span className="text-slate-400">frames (~{(srtDuration / project.fps).toFixed(1)}s)</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[#232d44] pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={generating || notes.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generating ? 'Generating File...' : `Download ${selectedFormat.toUpperCase()}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
