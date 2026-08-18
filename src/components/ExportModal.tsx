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
  // PDF Options
  const [includeCategory, setIncludeCategory] = useState(true);
  const [includeStillFrames, setIncludeStillFrames] = useState(true);
  const [thumbnailSize, setThumbnailSize] = useState<'Small' | 'Medium' | 'Large'>('Medium');
  const [margins, setMargins] = useState<'Narrow' | 'Normal' | 'Wide'>('Normal');

  // SRT Options
  const [srtSeconds, setSrtSeconds] = useState(3);
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

  const baseName = `${project.name.replace(/\s+/g, '_')}_${cut.name.replace(/\s+/g, '_')}_ReviewNotes`;

  const handleExportPDF = async () => {
    setGenerating(true);
    try {
      const pdfBlob = await generatePDFReport(project, cut, notes, branding);
      downloadFile(pdfBlob, `${baseName}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = generateCSV(project, cut, notes);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    downloadFile(blob, `${baseName}.csv`);
  };

  const handleExportTxt = () => {
    const txtContent = generateTextSummary(project, cut, notes);
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}.txt`);
  };

  const handleExportSRT = () => {
    const srtContent = generateSRT(project, notes, srtSeconds * project.fps);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}.srt`);
  };

  const handleExportEDL = () => {
    const edlContent = generateEDL(project, cut, notes);
    const blob = new Blob([edlContent], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${baseName}.edl`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header (Screenshot 5) */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black tracking-wider uppercase text-white">EXPORT NOTES</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">
          {notes.length} notes · downloads to your machine, nothing uploaded.
        </p>

        {/* PDF Report Box */}
        <div className="p-4 rounded-xl bg-[#151c2a] border border-[#222d42] mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-white">PDF report</h3>
              <p className="text-[10px] text-slate-400">
                Printable sheet: still frame, timecode, category, and note per row.
              </p>
            </div>
            <button
              type="button"
              disabled={generating}
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 rounded-lg bg-[#1b2336] hover:bg-blue-600 border border-[#283652] text-xs font-bold text-white flex items-center gap-1.5 transition active:scale-95 shadow shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generating ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCategory}
                onChange={e => setIncludeCategory(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500 rounded"
              />
              <span>Include category</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStillFrames}
                onChange={e => setIncludeStillFrames(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500 rounded"
              />
              <span>Include still frames</span>
            </label>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1e273b]">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Thumbnail size</label>
              <select
                value={thumbnailSize}
                onChange={e => setThumbnailSize(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d121c] border border-[#232d44] text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Small">Small</option>
                <option value="Medium">Medium</option>
                <option value="Large">Large</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Margins</label>
              <select
                value={margins}
                onChange={e => setMargins(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#0d121c] border border-[#232d44] text-[11px] text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Narrow">Narrow</option>
                <option value="Normal">Normal</option>
                <option value="Wide">Wide</option>
              </select>
            </div>
          </div>
        </div>

        {/* DATA FORMATS Section */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
            DATA FORMATS
          </span>

          <div className="space-y-2">
            {/* CSV */}
            <div
              onClick={handleExportCSV}
              className="p-3 rounded-xl bg-[#141b29] border border-[#222c42] hover:border-slate-600 flex items-center justify-between cursor-pointer group transition"
            >
              <div>
                <span className="text-xs font-bold text-white block">CSV</span>
                <span className="text-[10px] text-slate-400">Spreadsheet: timecode, category, note.</span>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </div>

            {/* Plain Text */}
            <div
              onClick={handleExportTxt}
              className="p-3 rounded-xl bg-[#141b29] border border-[#222c42] hover:border-slate-600 flex items-center justify-between cursor-pointer group transition"
            >
              <div>
                <span className="text-xs font-bold text-white block">Plain text</span>
                <span className="text-[10px] text-slate-400">Readable log of every note.</span>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </div>

            {/* SRT Subtitles */}
            <div className="p-3 rounded-xl bg-[#141b29] border border-[#222c42] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">SRT subtitles</span>
                  <span className="text-[10px] text-slate-400">
                    Each note as a timed subtitle at its timecode.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportSRT}
                  className="p-1 rounded text-slate-500 hover:text-white transition"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-[#1e273b] text-[11px] text-slate-300">
                <span>Each note lasts</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={srtSeconds}
                  onChange={e => setSrtSeconds(Number(e.target.value))}
                  className="w-12 px-2 py-0.5 rounded bg-[#090d14] border border-[#232d44] text-center text-white"
                />
                <span>seconds</span>
              </div>
            </div>

            {/* EDL (CMX3600) */}
            <div
              onClick={handleExportEDL}
              className="p-3 rounded-xl bg-[#141b29] border border-[#222c42] hover:border-slate-600 flex items-center justify-between cursor-pointer group transition"
            >
              <div>
                <span className="text-xs font-bold text-white block">EDL (CMX3600)</span>
                <span className="text-[10px] text-slate-400">
                  LOC marker lines for DaVinci Resolve / Avid.
                </span>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
