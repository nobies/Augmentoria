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
} from 'lucide-react';

interface AnnotationCanvasProps {
  isOpen: boolean;
  videoElement: HTMLVideoElement | null;
  onSaveDrawing: (drawingDataUrl: string, snapshotDataUrl: string) => void;
  onCancel: () => void;
}

type Tool = 'pen' | 'arrow' | 'rect' | 'circle';

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  isOpen,
  videoElement,
  onSaveDrawing,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('arrow');
  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    if (isOpen && canvasRef.current && videoElement) {
      const canvas = canvasRef.current;
      canvas.width = videoElement.videoWidth || videoElement.clientWidth || 1280;
      canvas.height = videoElement.videoHeight || videoElement.clientHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Save blank state to history
        setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  }, [isOpen, videoElement]);

  if (!isOpen) return null;

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const nextHistory = [...history];
      nextHistory.pop(); // Remove current
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      // Restore previous state for live shape preview
      if (history.length > 0) {
        ctx.putImageData(history[history.length - 1], 0, 0);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;

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
        drawArrow(ctx, startPos.x, startPos.y, coords.x, coords.y, strokeWidth);
      }
    }
  };

  const endDraw = () => {
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
    const headlen = width * 4 + 10;
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

    const drawingDataUrl = drawingCanvas.toDataURL('image/png');

    // Create composite image (Video Frame + Drawing overlay)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = drawingCanvas.width;
    compositeCanvas.height = drawingCanvas.height;
    const cCtx = compositeCanvas.getContext('2d');

    if (cCtx) {
      if (videoElement && videoElement.videoWidth > 0) {
        cCtx.drawImage(videoElement, 0, 0, compositeCanvas.width, compositeCanvas.height);
      } else {
        cCtx.fillStyle = '#0f172a';
        cCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
      }
      cCtx.drawImage(drawingCanvas, 0, 0);
    }

    const snapshotDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.85);
    onSaveDrawing(drawingDataUrl, snapshotDataUrl);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/40 backdrop-blur-[2px]">
      {/* Top Toolbar */}
      <div className="h-12 bg-[#0e1420]/90 border-b border-[#232d44] px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 mr-2 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5" />
            Drawing On Freeze Frame
          </span>

          {/* Tools */}
          <div className="flex items-center bg-[#171f30] rounded-lg p-0.5 border border-[#232d44]">
            {[
              { id: 'arrow', icon: MoveRight, title: 'Arrow' },
              { id: 'rect', icon: Square, title: 'Rectangle Box' },
              { id: 'circle', icon: Circle, title: 'Circle' },
              { id: 'pen', icon: PenTool, title: 'Freehand Pen' },
            ].map(t => {
              const ToolIcon = t.icon;
              const isSelected = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id as any)}
                  title={t.title}
                  className={`p-1.5 rounded-md transition ${
                    isSelected ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ToolIcon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1.5 ml-2">
            {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition ${
                  color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons (Undo, Clear, Cancel, Save) */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            title="Undo"
            className="p-1.5 rounded-lg bg-[#171f30] hover:bg-[#202a40] text-slate-300 disabled:opacity-30 transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title="Clear all drawings"
            className="p-1.5 rounded-lg bg-[#171f30] hover:bg-[#202a40] text-slate-300 transition"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-[#1a2233] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply To Note</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative cursor-crosshair flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
};
