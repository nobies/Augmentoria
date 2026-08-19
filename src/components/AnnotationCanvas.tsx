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
  Image as ImageIcon,
  Sparkles,
  RefreshCcw,
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

  // Placed Reference / Plate / Watermark Image State
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
      setImageOpacity(1);
      setImageScale(1);
      setImageRotation(0);
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

  // Upload and place image plate on shot
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = CANVAS_WIDTH * 0.45;
        const maxHeight = CANVAS_HEIGHT * 0.45;
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
          rotation: imageRotation,
          scale: imageScale,
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

    // 1. Composite final vector overlay with placed image plate
    const finalDrawingCanvas = document.createElement('canvas');
    finalDrawingCanvas.width = CANVAS_WIDTH;
    finalDrawingCanvas.height = CANVAS_HEIGHT;
    const fCtx = finalDrawingCanvas.getContext('2d');
    if (!fCtx) return;

    // Draw placed watermark/plate with rotation, scale and opacity
    if (placedImage) {
      fCtx.save();
      fCtx.globalAlpha = imageOpacity;
      const effectiveW = placedImage.w * imageScale;
      const effectiveH = placedImage.h * imageScale;
      const centerX = placedImage.x + effectiveW / 2;
      const centerY = placedImage.y + effectiveH / 2;

      fCtx.translate(centerX, centerY);
      fCtx.rotate((imageRotation * Math.PI) / 180);
      fCtx.drawImage(
        placedImage.img,
        -effectiveW / 2,
        -effectiveH / 2,
        effectiveW,
        effectiveH
      );
      fCtx.restore();
    }

    // Draw brush & shape vector strokes
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

    // Composite vector overlay onto snapshot
    sCtx.drawImage(finalDrawingCanvas, 0, 0);
    const snapshotDataUrl = snapshotCanvas.toDataURL('image/jpeg', 0.9);

    onSaveDrawing(drawingDataUrl, snapshotDataUrl);
  };

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

  return (
    <div className="absolute inset-0 z-40 bg-black/25 flex flex-col justify-between p-3 select-none pointer-events-auto">
      {/* Top Floating Action Bar */}
      <div className="flex items-center justify-between bg-[#111723]/95 backdrop-blur-md border border-[#232d44] p-2 rounded-2xl shadow-2xl max-w-4xl mx-auto w-full z-50">
        {/* Tools Selection */}
        <div className="flex items-center gap-1">
          {[
            { id: 'arrow', icon: MoveRight, label: 'Arrow' },
            { id: 'pen', icon: PenTool, label: 'Pen' },
            { id: 'rect', icon: Square, label: 'Rectangle' },
            { id: 'circle', icon: Circle, label: 'Circle' },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTool(t.id as Tool)}
                className={`p-2 rounded-xl transition ${
                  activeTool === t.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a2233]'
                }`}
                title={t.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          <label
            className={`p-2 rounded-xl cursor-pointer transition flex items-center gap-1 ${
              activeTool === 'image' || placedImage
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                : 'text-slate-400 hover:text-white hover:bg-[#1a2233]'
            }`}
            title="Upload Watermark / Reference Image"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[10px] font-bold hidden sm:inline">Add Image</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {/* Colors Palette */}
        <div className="flex items-center gap-1.5 px-3 border-x border-[#232d44]">
          {colors.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Stroke Width Slider */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] font-mono text-slate-400">Size:</span>
          <input
            type="range"
            min="2"
            max="12"
            value={strokeWidth}
            onChange={e => setStrokeWidth(Number(e.target.value))}
            className="w-16 accent-blue-500 cursor-pointer"
          />
        </div>

        {/* Undo / Clear Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-[#1a2233] transition"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Save / Cancel Buttons */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#232d44]">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow-lg shadow-green-900/30 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Note</span>
          </button>
        </div>
      </div>

      {/* Floating Image Control Bar when an Image is Placed */}
      {placedImage && (
        <div className="bg-[#141b29]/95 backdrop-blur-md border border-purple-500/40 p-2.5 rounded-2xl shadow-2xl max-w-2xl mx-auto w-full z-50 flex items-center justify-between gap-3 text-xs my-1 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 text-purple-300 font-bold">
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span>Image Controls:</span>
          </div>

          {/* Scale */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Scale:</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.05"
              value={imageScale}
              onChange={e => setImageScale(Number(e.target.value))}
              className="w-16 accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-purple-300">{Math.round(imageScale * 100)}%</span>
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Rotate:</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={imageRotation}
              onChange={e => setImageRotation(Number(e.target.value))}
              className="w-16 accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-purple-300">{imageRotation}°</span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={imageOpacity}
              onChange={e => setImageOpacity(Number(e.target.value))}
              className="w-16 accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-purple-300">{Math.round(imageOpacity * 100)}%</span>
          </div>

          {/* Reset Transforms */}
          <button
            type="button"
            onClick={() => {
              setImageScale(1);
              setImageRotation(0);
              setImageOpacity(1);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f283d] transition"
            title="Reset Transformations"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>

          {/* Delete Placed Image */}
          <button
            type="button"
            onClick={() => setPlacedImage(null)}
            className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition"
            title="Remove Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Interactive Freeze-Frame Canvas Container */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full max-h-[82vh] flex items-center justify-center overflow-hidden my-auto"
      >
        {/* Underlay Video Frame Background for HTML5 video if available */}
        {videoElement && videoElement.videoWidth > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <canvas
              ref={node => {
                if (node && videoElement) {
                  node.width = CANVAS_WIDTH;
                  node.height = CANVAS_HEIGHT;
                  const ctx = node.getContext('2d');
                  if (ctx) ctx.drawImage(videoElement, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }
              }}
              className="w-full h-full object-contain opacity-95"
            />
          </div>
        )}

        {/* Placed Interactive Image Overlay Container */}
        {placedImage && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ width: '100%', height: '100%' }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${(placedImage.x / CANVAS_WIDTH) * 100}%`,
                top: `${(placedImage.y / CANVAS_HEIGHT) * 100}%`,
                width: `${((placedImage.w * imageScale) / CANVAS_WIDTH) * 100}%`,
                height: `${((placedImage.h * imageScale) / CANVAS_HEIGHT) * 100}%`,
                opacity: imageOpacity,
                transform: `rotate(${imageRotation}deg)`,
                cursor: 'grab',
                pointerEvents: 'auto',
              }}
              className="border-2 border-dashed border-purple-500 rounded shadow-2xl group"
            >
              <img
                src={placedImage.img.src}
                alt="Placed plate"
                className="w-full h-full object-contain pointer-events-none select-none"
              />
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[8px] font-bold">
                Drag to Move
              </span>
            </div>
          </div>
        )}

        {/* Foreground Active Vector Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative z-20 w-full h-full object-contain cursor-crosshair"
        />
      </div>
    </div>
  );
};
