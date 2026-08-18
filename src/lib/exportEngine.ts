import { jsPDF } from 'jspdf';
import { Project, Cut, ReviewNote, StudioBranding } from './supabase';
import { framesToTimecode, timecodeToFrames } from './timecode';

// ----------------------------------------------------
// 1. EDL (CMX 3600) LOC MARKER GENERATOR
// ----------------------------------------------------
export function generateEDL(project: Project, cut: Cut, notes: ReviewNote[]): string {
  const lines: string[] = [
    `TITLE: ${project.name.toUpperCase()} - ${cut.name.toUpperCase()}`,
    'FCM: NON-DROP FRAME',
    '',
  ];

  notes.forEach((note, index) => {
    const eventNum = String(index + 1).padStart(3, '0');
    const inTc = note.timecode;
    const inFrames = timecodeToFrames(inTc, project.fps, project.dropFrame);
    const outFrames = note.timecodeOut
      ? timecodeToFrames(note.timecodeOut, project.fps, project.dropFrame)
      : inFrames + 1;
    const outTc = framesToTimecode(outFrames, project.fps, project.dropFrame);

    lines.push(`${eventNum}  AX       V     C        ${inTc} ${outTc} ${inTc} ${outTc}`);
    const cleanNote = (note.text || note.presetLabel).replace(/[\r\n]+/g, ' ');
    const markerColor =
      note.category === 'color'
        ? 'Cyan'
        : note.category === 'sound'
        ? 'Green'
        : note.category === 'vfx'
        ? 'Magenta'
        : 'Red';

    lines.push(`* LOC: ${inTc} ${markerColor} [${note.category.toUpperCase()}] ${note.presetLabel}: ${cleanNote}`);
    lines.push('');
  });

  return lines.join('\r\n');
}

// ----------------------------------------------------
// 2. SRT SUBTITLES GENERATOR
// ----------------------------------------------------
export function generateSRT(project: Project, notes: ReviewNote[], durationFrames = 50): string {
  const srtEntries: string[] = [];

  const tcToSrtTime = (tc: string) => {
    const [hh, mm, ss, ff] = tc.split(/[:;]/).map(Number);
    const ms = Math.round((ff / project.fps) * 1000);
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`;
  };

  notes.forEach((note, index) => {
    const inFrames = timecodeToFrames(note.timecode, project.fps, project.dropFrame);
    const outFrames = note.timecodeOut
      ? timecodeToFrames(note.timecodeOut, project.fps, project.dropFrame)
      : inFrames + durationFrames;

    const inSrt = tcToSrtTime(framesToTimecode(inFrames, project.fps, project.dropFrame));
    const outSrt = tcToSrtTime(framesToTimecode(outFrames, project.fps, project.dropFrame));

    const content = note.text ? `[${note.presetLabel}] ${note.text}` : `[${note.presetLabel}]`;

    srtEntries.push(`${index + 1}\n${inSrt} --> ${outSrt}\n${content}\n`);
  });

  return srtEntries.join('\n');
}

// ----------------------------------------------------
// 3. PREMIERE PRO CSV MARKERS
// ----------------------------------------------------
export function generatePremiereCSV(notes: ReviewNote[]): string {
  const headers = ['Marker Name', 'Description', 'In', 'Out', 'Duration', 'Marker Type'];
  const rows = notes.map(n => [
    `"${n.presetLabel}"`,
    `"${(n.text || '').replace(/"/g, '""')}"`,
    `"${n.timecode}"`,
    `"${n.timecodeOut || n.timecode}"`,
    `"00:00:01:00"`,
    `"Comment"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

// ----------------------------------------------------
// 4. CSV GENERAL SPREADSHEET
// ----------------------------------------------------
export function generateCSV(project: Project, cut: Cut, notes: ReviewNote[]): string {
  const headers = ['Index', 'Timecode In', 'Timecode Out', 'Category', 'Preset Action', 'Notes', 'Author', 'Status', 'Has Image', 'Has Audio'];
  const rows = notes.map((n, i) => [
    i + 1,
    `"${n.timecode}"`,
    `"${n.timecodeOut || ''}"`,
    `"${n.category}"`,
    `"${n.presetLabel}"`,
    `"${(n.text || '').replace(/"/g, '""')}"`,
    `"${n.authorName || 'Reviewer'}"`,
    n.isResolved ? '"Resolved"' : '"Pending"',
    n.stillImageUrl ? '"Yes"' : '"No"',
    n.audioBlobUrl ? '"Yes"' : '"No"',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

// ----------------------------------------------------
// 5. PLAIN TEXT / MARKDOWN SUMMARY
// ----------------------------------------------------
export function generateTextSummary(project: Project, cut: Cut, notes: ReviewNote[]): string {
  const lines: string[] = [
    `============================================================`,
    `PROJECT: ${project.name}`,
    `CUT / VERSION: ${cut.name}`,
    `TIMECODE BASE: ${project.fps} fps (${project.dropFrame ? 'DF' : 'NDF'})`,
    `TOTAL NOTES: ${notes.length}`,
    `EXPORT DATE: ${new Date().toLocaleString()}`,
    `============================================================\n`,
  ];

  notes.forEach((n, i) => {
    lines.push(`[#${i + 1}]  ${n.timecode}${n.timecodeOut ? ` -> ${n.timecodeOut}` : ''}  |  ${n.category.toUpperCase()}  |  ${n.presetLabel}`);
    if (n.text) {
      lines.push(`     Comments: "${n.text}"`);
    }
    if (n.stillImageUrl) {
      lines.push(`     [Frame Still & Markup Attached]`);
    }
    if (n.audioBlobUrl) {
      lines.push(`     [Voice Note Audio Recorded]`);
    }
    lines.push(`     Status: ${n.isResolved ? 'RESOLVED' : 'OPEN'}   By: ${n.authorName || 'Reviewer'}`);
    lines.push('------------------------------------------------------------');
  });

  return lines.join('\n');
}

// ----------------------------------------------------
// 6. BRANDED VISUAL PDF REPORT (WITH FRAME STILLS & MARKUPS)
// ----------------------------------------------------
export async function generatePDFReport(
  project: Project,
  cut: Cut,
  notes: ReviewNote[],
  branding: StudioBranding
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Dark Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, 'F');

  // Studio / Project Info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.name || 'Studio Review Report', 15, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(branding.tagline || 'Post-Production Review & Quality Report', 15, 23);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Project: ${project.name}`, 15, 34);
  doc.text(`Cut: ${cut.name} (${project.fps} fps)`, 120, 34);

  let yPos = 50;
  const pageHeight = 280;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const cardHeight = note.stillImageUrl ? 36 : 26;

    // Check if new page needed
    if (yPos + cardHeight > pageHeight) {
      doc.addPage();
      yPos = 20;
    }

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, yPos, 186, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, yPos, 186, cardHeight, 2, 2, 'S');

    // Thumbnail still on Left if available
    let textLeftMargin = 16;
    if (note.stillImageUrl && note.stillImageUrl.startsWith('data:image')) {
      try {
        doc.addImage(note.stillImageUrl, 'JPEG', 16, yPos + 4, 42, 26);
        textLeftMargin = 64; // shift text to right of image
      } catch (e) {}
    }

    // Category tag pill
    const catColor =
      note.category === 'editorial'
        ? [59, 130, 246]
        : note.category === 'vfx'
        ? [168, 85, 247]
        : note.category === 'color'
        ? [234, 88, 12]
        : [16, 185, 129];
    doc.setFillColor(catColor[0], catColor[1], catColor[2]);
    doc.roundedRect(textLeftMargin, yPos + 4, 20, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(note.category.toUpperCase(), textLeftMargin + 2, yPos + 8);

    // Timecode & Preset Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const tcTitle = `${note.timecode}${note.timecodeOut ? ` -> ${note.timecodeOut}` : ''}  -  ${note.presetLabel}`;
    doc.text(tcTitle, textLeftMargin + 24, yPos + 8.5);

    // Comments
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const availableWidth = 190 - textLeftMargin;
    const splitText = doc.splitTextToSize(note.text || 'No comment provided', availableWidth);
    doc.text(splitText, textLeftMargin, yPos + 17);

    // Voice Note indicator badge
    if (note.audioBlobUrl) {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('[Voice Clip Recorded]', textLeftMargin, yPos + cardHeight - 3);
    }

    yPos += cardHeight + 4;
  }

  // Footer Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by ${branding.name || 'DropMedia Screener'} • Page ${p} of ${totalPages}`, 15, 290);
  }

  return doc.output('blob');
}
