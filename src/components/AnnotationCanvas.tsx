'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  MoveRight,
  Square,
  Circle,
  Undo2,
  Trash2,
  Check,
  X,
  Upload,
  Move,
} from 'lucide-react';

interface AnnotationCanvasProps {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  posterDataUrl?: string | null;
  onSaveDrawing: (drawingDataUrl: string, snapshotDataUrl: string) => void;
  onCancel: () => void;
}

type Tool = 'pen' | 'arrow' | 'rect' | 'circle' | 'image';

interface PlacedImage {
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  isOpen,
  videoElement,
  posterDataUrl,
  onSaveDrawing,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('arrow');
  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Placed Watermark / Reference Image State
  const [placedImage, setPlacedImage] = useState<PlacedImage | null>(null);
  const [imageOpacity, setImageOpacity] = useState<number>(1);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setHistory([ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)]);
      }
      setPlacedImage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      setHistory(prev => [...prev.slice(-15), ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)]);
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const nextHistory = [...history];
      nextHistory.pop();
      const prevState = nextHistory[nextHistory.length - 1];
      ctx.putImageData(prevState, 0, 0);
      setHistory(nextHistory);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      setPlacedImage(null);
      saveState();
    }
  };

  // Upload and place watermark image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = CANVAS_WIDTH * 0.4;
        const maxHeight = CANVAS_HEIGHT * 0.4;
        let w = img.width;
        let h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = w * ratio;
          h = h * ratio;
        }

        const newPlaced: PlacedImage = {
          img,
          x: (CANVAS_WIDTH - w) / 2,
          y: (CANVAS_HEIGHT - h) / 2,
          w,
          h,
          opacity: imageOpacity,
        };
        setPlacedImage(newPlaced);
        setActiveTool('image');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);

    if (placedImage) {
      const insideImage =
        coords.x >= placedImage.x &&
        coords.x <= placedImage.x + placedImage.w &&
        coords.y >= placedImage.y &&
        coords.y <= placedImage.y + placedImage.h;

      if (insideImage) {
        setIsDraggingImage(true);
        setDragOffset({ x: coords.x - placedImage.x, y: coords.y - placedImage.y });
        return;
      }
    }

    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);

    if (isDraggingImage && placedImage) {
      setPlacedImage({
        ...placedImage,
        x: Math.max(0, Math.min(coords.x - dragOffset.x, CANVAS_WIDTH - placedImage.w)),
        y: Math.max(0, Math.min(coords.y - dragOffset.y, CANVAS_HEIGHT - placedImage.h)),
      });
      return;
    }

    if (!isDrawing || !startPos) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 2;

      if (activeTool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(coords.x - startPos.x) / 2;
        const ry = Math.abs(coords.y - startPos.y) / 2;
        const cx = Math.min(startPos.x, coords.x) + rx;
        const cy = Math.min(startPos.y, coords.y) + ry;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y, strokeWidth * 2);
      }
    }
  };

  const endDraw = () => {
    if (isDraggingImage) {
      setIsDraggingImage(false);
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
      saveState();
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromx: number,
    fromy: number,
    tox: number,
    toy: number,
    width: number
  ) => {
    const headlen = width * 4 + 15;
    const angle = Math.atan2(toy - fromy, tox - fromx);

    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(tox, toy);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const handleFinish = () => {
    const drawingCanvas = canvasRef.current;
    if (!drawingCanvas) return;

    // 1. Vector Drawing DataURL
    const finalDrawingCanvas = document.createElement('canvas');
    finalDrawingCanvas.width = CANVAS_WIDTH;
    finalDrawingCanvas.height = CANVAS_HEIGHT;
    const fCtx = finalDrawingCanvas.getContext('2d');

    if (fCtx) {
      if (placedImage) {
        fCtx.globalAlpha = imageOpacity;
        fCtx.drawImage(placedImage.img, placedImage.x, placedImage.y, placedImage.w, placedImage.h);
        fCtx.globalAlpha = 1.0;
      }
      fCtx.drawImage(drawingCanvas, 0, 0);
    }

    const drawingDataUrl = finalDrawingCanvas.toDataURL('image/png');

    // 2. Full Frame Snapshot DataURL (Video Frame + Drawing)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = 640;
    compositeCanvas.height = 360;
    const cCtx = compositeCanvas.getContext('2d');

    if (cCtx) {
      if (videoElement && videoElement.videoWidth > 0) {
        cCtx.drawImage(videoElement, 0, 0, 640, 360);
        cCtx.drawImage(finalDrawingCanvas, 0, 0, 640, 360);
        const snapshotDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.88);
        onSaveDrawing(drawingDataUrl, snapshotDataUrl);
      } else if (posterDataUrl) {
        const bgImg = new Image();
        bgImg.onload = () => {
          cCtx.drawImage(bgImg, 0, 0, 640, 360);
          cCtx.drawImage(finalDrawingCanvas, 0, 0, 640, 360);
          const snapshotDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.88);
          onSaveDrawing(drawingDataUrl, snapshotDataUrl);
        };
        bgImg.src = posterDataUrl;
      } else {
        cCtx.fillStyle = '#0b0f17';
        cCtx.fillRect(0, 0, 640, 360);
        cCtx.drawImage(finalDrawingCanvas, 0, 0, 640, 360);
        const snapshotDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.88);
        onSaveDrawing(drawingDataUrl, snapshotDataUrl);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 flex flex-col bg-black/60 backdrop-blur-[1px] select-none"
    >
      {/* Background Frame Poster (for Vimeo/External) */}
      {posterDataUrl && !videoElement && (
        <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
          <img src={posterDataUrl} alt="Background Still" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Top Floating Toolbar */}
      <div className="h-11 bg-[#0c1018]/95 border-b border-[#232d44] px-3 flex items-center justify-between text-white flex-wrap gap-2 z-30">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
            <PenTool className="w-3 h-3" />
            Markup & Watermark
          </span>

          {/* Tools */}
          <div className="flex items-center bg-[#141b29] rounded-lg p-0.5 border border-[#232d44]">
            {[
              { id: 'arrow', icon: MoveRight, title: 'Arrow' },
              { id: 'rect', icon: Square, title: 'Box' },
              { id: 'circle', icon: Circle, title: 'Circle' },
              { id: 'pen', icon: PenTool, title: 'Pen' },
            ].map(t => {
              const ToolIcon = t.icon;
              const isSelected = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id as any)}
                  title={t.title}
                  className={`p-1 rounded transition ${
                    isSelected ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ToolIcon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 ml-1">
            {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border transition ${
                  color === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-80'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Upload Watermark Button */}
          <label className="cursor-pointer ml-1">
            <div className="px-2 py-0.5 rounded-lg bg-[#1a2336] hover:bg-[#25324d] border border-[#2e3b57] text-[10px] font-semibold text-slate-200 flex items-center gap-1 transition">
              <Upload className="w-2.5 h-2.5 text-blue-400" />
              <span>{placedImage ? 'Replace Watermark' : 'Add Watermark'}</span>
            </div>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          {/* Watermark Opacity Controls */}
          {placedImage && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#141b29] border border-[#232d44] text-[10px]">
              <span className="text-slate-400 font-semibold">Opacity:</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={imageOpacity}
                onChange={e => {
                  const op = parseFloat(e.target.value);
                  setImageOpacity(op);
                  if (placedImage) setPlacedImage({ ...placedImage, opacity: op });
                }}
                className="w-16 cursor-pointer accent-blue-500"
              />
              <span className="font-mono text-blue-400">{Math.round(imageOpacity * 100)}%</span>
              <button onClick={() => setPlacedImage(null)} className="ml-0.5 text-slate-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            title="Undo"
            className="p-1 rounded-lg bg-[#141b29] text-slate-300 disabled:opacity-30"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleClear} title="Clear" className="p-1 rounded-lg bg-[#141b29] text-slate-300">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>

          <button
            onClick={onCancel}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#1a2233]"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
          >
            <Check className="w-3 h-3" />
            <span>Apply Note</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden flex items-center justify-center">
        {placedImage && (
          <div
            style={{
              position: 'absolute',
              left: `${(placedImage.x / CANVAS_WIDTH) * 100}%`,
              top: `${(placedImage.y / CANVAS_HEIGHT) * 100}%`,
              width: `${(placedImage.w / CANVAS_WIDTH) * 100}%`,
              height: `${(placedImage.h / CANVAS_HEIGHT) * 100}%`,
              opacity: imageOpacity,
            }}
            className="border border-dashed border-blue-400 cursor-move pointer-events-none group z-10"
          >
            <img src={placedImage.img.src} alt="Watermark" className="w-full h-full object-contain" />
            <div className="absolute top-0.5 right-0.5 bg-black/80 text-white text-[8px] px-1 rounded flex items-center gap-0.5">
              <Move className="w-2 h-2" /> Drag
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          className="w-full h-full object-contain z-20"
        />
      </div>
    </div>
  );
};
