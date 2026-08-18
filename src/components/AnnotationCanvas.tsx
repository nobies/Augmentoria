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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('arrow');
  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Fixed internal coordinate space (1920x1080) for high-definition drawing
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
      saveState();
    }
  };

  // Convert client mouse event to internal canvas coordinates (0..1920, 0..1080)
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
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && activeTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * 2; // scaled for 1080p
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos) return;
    const coords = getCoords(e);
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

    const drawingDataUrl = drawingCanvas.toDataURL('image/png');

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = 640;
    compositeCanvas.height = 360;
    const cCtx = compositeCanvas.getContext('2d');

    if (cCtx) {
      if (videoElement && videoElement.videoWidth > 0) {
        cCtx.drawImage(videoElement, 0, 0, 640, 360);
      } else {
        cCtx.fillStyle = '#0b0f17';
        cCtx.fillRect(0, 0, 640, 360);
      }
      cCtx.drawImage(drawingCanvas, 0, 0, 640, 360);
    }

    const snapshotDataUrl = compositeCanvas.toDataURL('image/jpeg', 0.85);
    onSaveDrawing(drawingDataUrl, snapshotDataUrl);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 flex flex-col bg-black/60 backdrop-blur-[1px] select-none"
    >
      {/* Top Floating Toolbar */}
      <div className="h-12 bg-[#0c1018]/95 border-b border-[#232d44] px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5" />
            Freeze Frame Markup
          </span>

          {/* Tools */}
          <div className="flex items-center bg-[#141b29] rounded-lg p-0.5 border border-[#232d44]">
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            title="Undo"
            className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] text-slate-300 disabled:opacity-30 transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title="Clear canvas"
            className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] text-slate-300 transition"
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

      {/* Canvas Area (100% matched to Video 16:9 Aspect Ratio) */}
      <div className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
