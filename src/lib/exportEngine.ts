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
// 6. 1:1 DROPMEDIA REPLICA BRANDED PDF REPORT (Exact Screenshot Match)
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

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  // Header function
  const renderHeader = (pageNumber: number) => {
    // Title (Top Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(`${project.name} - ${cut.name}`, marginX, 16);

    // Date (Top Right)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toISOString().split('T')[0];
    doc.text(dateStr, pageWidth - marginX, 16, { align: 'right' });

    // Subtitle Line
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${notes.length} notes · ${project.fps} fps · start ${project.startTimecode || '01:00:00:00'}`,
      marginX,
      21.5
    );

    // Top Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, 25, pageWidth - marginX, 25);
  };

  renderHeader(1);

  let yPos = 30;
  const rowHeight = 31; // height per note item row

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    // Check if new page needed
    if (yPos + rowHeight > pageHeight - 18) {
      doc.addPage();
      renderHeader(doc.getNumberOfPages());
      yPos = 30;
    }

    const imgWidth = 46;
    const imgHeight = 26; // 16:9 ratio

    // 1. Frame Thumbnail (Left)
    if (note.stillImageUrl) {
      try {
        let imgData = note.stillImageUrl;
        if (!imgData.startsWith('data:image')) {
          const res = await fetch(imgData);
          const blob = await res.blob();
          imgData = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        doc.addImage(imgData, 'JPEG', marginX, yPos + 1, imgWidth, imgHeight);
      } catch (e) {
        // Fallback gray box
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos + 1, imgWidth, imgHeight, 'F');
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, yPos + 1, imgWidth, imgHeight, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No Frame Still', marginX + 12, yPos + 14);
    }

    // 2. Right Text Column
    const textStartX = marginX + imgWidth + 8;

    // Timecode (Bold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(note.timecode, textStartX, yPos + 7);

    // Colored Category Dot & Category Title
    const catDotColor =
      note.category === 'editorial'
        ? [239, 68, 68]
        : note.category === 'vfx'
        ? [59, 130, 246]
        : note.category === 'color'
        ? [245, 158, 11]
        : [16, 185, 129];

    doc.setFillColor(catDotColor[0], catDotColor[1], catDotColor[2]);
    doc.circle(textStartX + 26, yPos + 6.2, 1.2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const catName = note.category ? note.category.charAt(0).toUpperCase() + note.category.slice(1) : 'Editorial';
    doc.text(catName, textStartX + 29, yPos + 7);

    // Comment Text / Preset Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const mainText = note.text ? `${note.presetLabel}: ${note.text}` : note.presetLabel;
    const splitText = doc.splitTextToSize(mainText, contentWidth - imgWidth - 10);
    doc.text(splitText, textStartX, yPos + 14);

    // 3. Subtle bottom row divider line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, yPos + rowHeight - 2, pageWidth - marginX, yPos + rowHeight - 2);

    yPos += rowHeight;
  }

  // Footer for all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    // Left: Page 1 of 1
    doc.text(`Page ${p} of ${totalPages}`, marginX, 290);

    // Center: Project - Cut
    doc.text(`${project.name} - ${cut.name}`, pageWidth / 2, 290, { align: 'center' });

    // Right: Review notes · made with dropmedia.io (or Studio Name)
    doc.text(`Review notes · made with ${branding.name || 'dropmedia.io'}`, pageWidth - marginX, 290, {
      align: 'right',
    });
  }

  return doc.output('blob');
}
