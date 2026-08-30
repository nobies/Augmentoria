import type { AnnotationLayer } from './store';
import { idb } from './idb';

const REF_W = 1280;
const REF_H = 720;
const THUMB_W = 480;

export interface CommentThumbnailResult {
  clean: string;
  annotated: string;
}

export interface StoredCommentThumbnail extends CommentThumbnailResult {
  id: string;
  createdAt: number;
}

export async function saveCommentThumbnail(id: string, clean?: string, annotated?: string) {
  const fallback = annotated ?? clean;
  if (!fallback) return;
  await idb.put('commentThumb', {
    id,
    clean: clean ?? fallback,
    annotated: annotated ?? fallback,
    createdAt: Date.now()
  } satisfies StoredCommentThumbnail);
}

export function loadCommentThumbnail(id: string) {
  return idb.get<StoredCommentThumbnail>('commentThumb', id);
}

export function deleteCommentThumbnail(id: string) {
  return idb.del('commentThumb', id);
}

export async function deleteCommentThumbnails(ids: string[]) {
  await Promise.all(ids.map((id) => deleteCommentThumbnail(id)));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function withLayerTransform(ctx: CanvasRenderingContext2D, layer: AnnotationLayer, draw: () => void) {
  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 0.95;
  if (layer.rotation && layer.x !== undefined && layer.y !== undefined) {
    const centerX = layer.x + (layer.w ?? 0) / 2;
    const centerY = layer.y + (layer.h ?? 0) / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  draw();
  ctx.restore();
}

async function drawLayer(ctx: CanvasRenderingContext2D, layer: AnnotationLayer) {
  if (!layer.visible) return;
  ctx.strokeStyle = layer.color;
  ctx.fillStyle = layer.color;
  ctx.lineWidth = layer.sw * 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (layer.type === 'image' && layer.src && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h) {
    const image = await loadImage(layer.src);
    if (image) withLayerTransform(ctx, layer, () => ctx.drawImage(image, layer.x!, layer.y!, layer.w!, layer.h!));
    return;
  }

  withLayerTransform(ctx, layer, () => {
    if (layer.type === 'pen' && layer.pts && layer.pts.length > 1) {
      ctx.beginPath();
      layer.pts.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.stroke();
    } else if (layer.type === 'arrow' && layer.x !== undefined && layer.y !== undefined && layer.w !== undefined && layer.h !== undefined) {
      const endX = layer.x + layer.w;
      const endY = layer.y + layer.h;
      const angle = Math.atan2(layer.h, layer.w);
      const length = Math.min(28, Math.hypot(layer.w, layer.h) / 3);
      ctx.beginPath();
      ctx.moveTo(layer.x, layer.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(endX - length * Math.cos(angle - 0.45), endY - length * Math.sin(angle - 0.45));
      ctx.lineTo(endX, endY);
      ctx.lineTo(endX - length * Math.cos(angle + 0.45), endY - length * Math.sin(angle + 0.45));
      ctx.stroke();
    } else if (layer.type === 'circle' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h) {
      ctx.beginPath();
      ctx.ellipse(layer.x + layer.w / 2, layer.y + layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (layer.type === 'rect' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h) {
      ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
    } else if (layer.type === 'text' && layer.text && layer.x !== undefined && layer.y !== undefined) {
      ctx.font = `700 ${layer.fs}px Cairo, Inter, sans-serif`;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(layer.text, layer.x, layer.y);
      ctx.fillStyle = layer.color;
      ctx.fillText(layer.text, layer.x, layer.y);
    }
  });
}

export async function renderCommentThumbnail(video: HTMLVideoElement, layers: AnnotationLayer[]): Promise<CommentThumbnailResult | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  const height = Math.max(1, Math.round((THUMB_W * video.videoHeight) / video.videoWidth));
  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = THUMB_W;
  cleanCanvas.height = height;
  const cleanContext = cleanCanvas.getContext('2d');
  if (!cleanContext) return null;
  cleanContext.drawImage(video, 0, 0, THUMB_W, height);

  const annotatedCanvas = document.createElement('canvas');
  annotatedCanvas.width = THUMB_W;
  annotatedCanvas.height = height;
  const context = annotatedCanvas.getContext('2d');
  if (!context) return null;
  context.drawImage(cleanCanvas, 0, 0);
  context.save();
  context.scale(THUMB_W / REF_W, height / REF_H);
  for (const layer of layers) await drawLayer(context, layer);
  context.restore();

  return {
    clean: cleanCanvas.toDataURL('image/jpeg', 0.76),
    annotated: annotatedCanvas.toDataURL('image/jpeg', 0.82),
  };
}
