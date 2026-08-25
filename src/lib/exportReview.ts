import type { AnnotationLayer, ReviewComment } from './store';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportCommentsCSV(comments: (ReviewComment & { layerCount?: number })[], authorName: (id: string) => string, projectLabel: string) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    ['#', 'Type', 'Timecode IN', 'Timecode OUT', 'Author', 'Comment', 'Resolved', 'Replies', 'Layers', 'Created'],
    ...comments.map((c, i) => [
      String(i + 1),
      c.kind,
      fmtTc(c.tc),
      c.rangeEnd !== undefined ? fmtTc(c.rangeEnd) : '',
      esc(authorName(c.authorId)),
      esc(c.text),
      c.resolved ? 'yes' : 'no',
      String(c.replies.length),
      String(c.layerCount ?? 0),
      c.createdAt
    ])
  ];
  const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${slug(projectLabel)}-comments.csv`);
}

export function exportSessionJSON(payload: unknown, projectLabel: string) {
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slug(projectLabel)}-review-session.json`);
}

export async function exportFramePNG(
  video: HTMLVideoElement,
  layers: AnnotationLayer[],
  refW: number,
  refH: number,
  label: string
) {
  const canvas = document.createElement('canvas');
  canvas.width = refW;
  canvas.height = refH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, refW, refH);

  for (const l of layers) {
    if (!l.visible) continue;
    ctx.strokeStyle = l.color;
    ctx.fillStyle = l.color;
    ctx.lineWidth = l.sw * 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (l.type === 'pen' && l.pts && l.pts.length > 1) {
      ctx.beginPath();
      l.pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (l.type === 'arrow' && l.x !== undefined && l.y !== undefined && l.w !== undefined && l.h !== undefined) {
      const x2 = l.x + l.w;
      const y2 = l.y + l.h;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const ang = Math.atan2(l.h, l.w);
      const len = Math.min(28, Math.hypot(l.w, l.h) / 3);
      ctx.beginPath();
      ctx.moveTo(x2 - len * Math.cos(ang - 0.45), y2 - len * Math.sin(ang - 0.45));
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 - len * Math.cos(ang + 0.45), y2 - len * Math.sin(ang + 0.45));
      ctx.stroke();
    } else if (l.type === 'circle' && l.x !== undefined && l.y !== undefined && l.w && l.h) {
      ctx.beginPath();
      ctx.ellipse(l.x + l.w / 2, l.y + l.h / 2, l.w / 2, l.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (l.type === 'rect' && l.x !== undefined && l.y !== undefined && l.w && l.h) {
      ctx.strokeRect(l.x, l.y, l.w, l.h);
    } else if (l.type === 'text' && l.text && l.x !== undefined && l.y !== undefined) {
      ctx.font = `700 ${l.fs * 1.3}px Cairo, Inter, sans-serif`;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(l.text, l.x, l.y);
      ctx.fillText(l.text, l.x, l.y);
    } else if (l.type === 'image' && l.src && l.x !== undefined && l.y !== undefined && l.w && l.h) {
      await new Promise<void>((done) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, l.x!, l.y!, l.w!, l.h!);
          done();
        };
        img.onerror = () => done();
        img.src = l.src!;
      });
    }
  }

  await new Promise<void>((resolve) =>
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${slug(label)}-frame.png`);
      resolve();
    }, 'image/png')
  );
}

function fmtTc(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * 25);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'review';
}
