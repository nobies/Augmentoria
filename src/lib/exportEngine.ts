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
    // 1 frame duration for marker point or end tc
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
  const headers = ['Index', 'Timecode In', 'Timecode Out', 'Category', 'Preset Action', 'Notes', 'Author', 'Status'];
  const rows = notes.map((n, i) => [
    i + 1,
    `"${n.timecode}"`,
    `"${n.timecodeOut || ''}"`,
    `"${n.category}"`,
    `"${n.presetLabel}"`,
    `"${(n.text || '').replace(/"/g, '""')}"`,
    `"${n.authorName || 'Reviewer'}"`,
    n.isResolved ? '"Resolved"' : '"Pending"',
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
      lines.push(`     "${n.text}"`);
    }
    lines.push(`     Status: ${n.isResolved ? 'RESOLVED' : 'OPEN'}   By: ${n.authorName || 'Reviewer'}`);
    lines.push('------------------------------------------------------------');
  });

  return lines.join('\n');
}

// ----------------------------------------------------
// 6. BRANDED PDF REPORT WITH STILLS
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

  // Dark background header
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, 210, 42, 'F');

  // Studio / Project info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(branding.name || 'Studio Review Report', 15, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(branding.tagline || 'Post-Production Notes', 15, 23);

  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Project: ${project.name}`, 15, 34);
  doc.text(`Cut: ${cut.name} (${project.fps} fps)`, 120, 34);

  // Notes list
  let yPos = 52;
  const pageHeight = 280;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    // Check if new page needed
    if (yPos > pageHeight - 35) {
      doc.addPage();
      yPos = 20;
    }

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(12, yPos, 186, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, yPos, 186, 28, 2, 2, 'S');

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
    doc.roundedRect(16, yPos + 4, 22, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(note.category.toUpperCase(), 18, yPos + 8.2);

    // Timecode & Preset Label
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${note.timecode}  -  ${note.presetLabel}`, 42, yPos + 9);

    // Note Text
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(note.text || 'No comment added', 140);
    doc.text(splitText, 16, yPos + 18);

    // Thumbnail still if exists
    if (note.stillImageUrl && note.stillImageUrl.startsWith('data:image')) {
      try {
        doc.addImage(note.stillImageUrl, 'JPEG', 162, yPos + 3, 32, 22);
      } catch (e) {
        // ignore image error
      }
    }

    yPos += 34;
  }

  // Footer page number
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by ${branding.name || 'DropMedia Screener'} • Page ${p} of ${totalPages}`, 15, 290);
  }

  return doc.output('blob');
}
