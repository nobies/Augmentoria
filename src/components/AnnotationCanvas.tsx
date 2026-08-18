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
  RotateCw,
  Maximize2,
  Sliders,
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
  rotation: number; // degrees -180 to 180
  scale: number; // 0.2 to 3.0
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
  const [imageScale, setImageScale] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
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
        const maxWidth = CANVAS_WIDTH * 0.35;
        const maxHeight = CANVAS_HEIGHT * 0.35;
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
          rotation: 0,
          scale: 1,
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);

    if (activeTool === 'image' && placedImage) {
      const imgW = placedImage.w * imageScale;
      const imgH = placedImage.h * imageScale;
      if (
        coords.x >= placedImage.x &&
        coords.x <= placedImage.x + imgW &&
        coords.y >= placedImage.y &&
        coords.y <= placedImage.y + imgH
      ) {
        setIsDraggingImage(true);
        setDragOffset({ x: coords.x - placedImage.x, y: coords.y - placedImage.y });
        return;
      }
    }

    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);

    if (isDraggingImage && placedImage) {
      setPlacedImage(prev => (prev ? { ...prev, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y } : null));
      return;
    }

    if (!isDrawing || !startPos) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'arrow') {
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y);
      } else if (activeTool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, coords.x - startPos.x, coords.y - startPos.y);
      } else if (activeTool === 'circle') {
        const radiusX = Math.abs(coords.x - startPos.x) / 2;
        const radiusY = Math.abs(coords.y - startPos.y) / 2;
        const centerX = startPos.x + (coords.x - startPos.x) / 2;
        const centerY = startPos.y + (coords.y - startPos.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
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

  const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number) => {
    const headlen = 24 * (strokeWidth / 4);
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const handleSave = () => {
    const drawingCanvas = canvasRef.current;
    if (!drawingCanvas) return;

    // 1. Composite final vector with placed image
    const finalDrawingCanvas = document.createElement('canvas');
    finalDrawingCanvas.width = CANVAS_WIDTH;
    finalDrawingCanvas.height = CANVAS_HEIGHT;
    const fCtx = finalDrawingCanvas.getContext('2d');
    if (!fCtx) return;

    // Draw placed watermark/plate
    if (placedImage) {
      fCtx.save();
      fCtx.globalAlpha = imageOpacity;
      const centerX = placedImage.x + (placedImage.w * imageScale) / 2;
      const centerY = placedImage.y + (placedImage.h * imageScale) / 2;
      fCtx.translate(centerX, centerY);
      fCtx.rotate((imageRotation * Math.PI) / 180);
      fCtx.drawImage(
        placedImage.img,
        -(placedImage.w * imageScale) / 2,
        -(placedImage.h * imageScale) / 2,
        placedImage.w * imageScale,
        placedImage.h * imageScale
      );
      fCtx.restore();
    }

    // Draw brush strokes
    fCtx.drawImage(drawingCanvas, 0, 0);
    const drawingDataUrl = finalDrawingCanvas.toDataURL('image/png');

    // 2. Composite snapshot with video frame background
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = CANVAS_WIDTH;
    snapshotCanvas.height = CANVAS_HEIGHT;
    const sCtx = snapshotCanvas.getContext('2d');
    if (!sCtx) return;

    if (videoElement && videoElement.videoWidth > 0) {
      sCtx.drawImage(videoElement, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (posterDataUrl) {
      const img = new Image();
      img.src = posterDataUrl;
      sCtx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    sCtx.drawImage(finalDrawingCanvas, 0, 0);
    const snapshotDataUrl = snapshotCanvas.toDataURL('image/jpeg', 0.88);

    onSaveDrawing(drawingDataUrl, snapshotDataUrl);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-between select-none"
    >
      {/* Top Floating Action Toolbar */}
      <div className="mt-3 px-3 py-1.5 bg-[#0f1422]/95 border border-[#222d44] rounded-2xl shadow-2xl flex items-center gap-3 text-white z-50">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-[#141b29] p-1 rounded-xl border border-[#202b40]">
          {[
            { id: 'arrow', label: 'Arrow', icon: MoveRight },
            { id: 'pen', label: 'Pen', icon: PenTool },
            { id: 'rect', label: 'Box', icon: Square },
            { id: 'circle', label: 'Circle', icon: Circle },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id as Tool)}
                className={`p-1.5 rounded-lg transition active:scale-95 ${
                  activeTool === t.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a2336]'
                }`}
                title={t.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition ${
                color === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-80'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Upload Watermark Image */}
        <label className="cursor-pointer">
          <div
            className={`px-2 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition ${
              placedImage
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-[#141b29] border-[#222c42] text-slate-300 hover:text-white'
            }`}
            title="Upload Watermark / Reference Image"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{placedImage ? 'Image Placed' : 'Add Image'}</span>
          </div>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>

        {/* History / Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1a2336] transition"
            title="Clear All"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Commit / Cancel */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#222d44]">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl bg-[#171f30] hover:bg-slate-700 text-slate-300 transition"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Stamp Note</span>
          </button>
        </div>
      </div>

      {/* Watermark / Image Controls Bar (When Image is Placed) */}
      {placedImage && (
        <div className="mt-2 px-3 py-1.5 bg-[#0f1422]/95 border border-amber-500/30 rounded-xl shadow-2xl flex items-center gap-4 text-xs text-white z-50 animate-in fade-in">
          <span className="text-[10px] font-bold uppercase text-amber-400">Image Controls:</span>

          {/* Scale Slider */}
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Scale:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={imageScale}
              onChange={e => setImageScale(Number(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-amber-300">{Math.round(imageScale * 100)}%</span>
          </div>

          {/* Rotation Slider */}
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Rotate:</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={imageRotation}
              onChange={e => setImageRotation(Number(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-amber-300">{imageRotation}°</span>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={imageOpacity}
              onChange={e => setImageOpacity(Number(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-amber-300">{Math.round(imageOpacity * 100)}%</span>
          </div>

          {/* Remove Image */}
          <button
            type="button"
            onClick={() => setPlacedImage(null)}
            className="text-red-400 hover:text-red-300 text-[10px] font-bold ml-1"
          >
            Remove Image
          </button>
        </div>
      )}

      {/* Main Interactive Freeze-Frame Canvas Container */}
      <div className="relative flex-1 w-full flex items-center justify-center p-2 overflow-hidden">
        {/* Background Poster (for Vimeo / Local preview while drawing) */}
        {posterDataUrl && (
          <img
            src={posterDataUrl}
            alt="Freeze Frame"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90"
          />
        )}

        {/* Placed Image Layer */}
        {placedImage && (
          <div
            style={{
              position: 'absolute',
              left: `${(placedImage.x / CANVAS_WIDTH) * 100}%`,
              top: `${(placedImage.y / CANVAS_HEIGHT) * 100}%`,
              width: `${((placedImage.w * imageScale) / CANVAS_WIDTH) * 100}%`,
              height: `${((placedImage.h * imageScale) / CANVAS_HEIGHT) * 100}%`,
              opacity: imageOpacity,
              transform: `rotate(${imageRotation}deg)`,
              transformOrigin: 'center center',
            }}
            className="pointer-events-none ring-2 ring-amber-400/80 rounded"
          >
            <img src={placedImage.img.src} alt="Placed Watermark" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Drawing Vector Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="relative w-full h-full object-contain cursor-crosshair z-30"
        />
      </div>

      <div className="mb-2 text-[10px] text-slate-400 font-medium">
        Draw on freeze frame • Drag image to reposition • Click Stamp Note to save
      </div>
    </div>
  );
};
