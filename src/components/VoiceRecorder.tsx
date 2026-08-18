'use client';

import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Play, Pause, Check } from 'lucide-react';

interface VoiceRecorderProps {
  onSaveAudio: (audioBlob: Blob, audioUrl: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSaveAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleDiscard = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsRecording(false);
    onCancel();
  };

  const handleSave = () => {
    if (recordedBlob && recordedUrl) {
      onSaveAudio(recordedBlob, recordedUrl);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !recordedUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSec = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="p-3 bg-[#131926] border border-[#232f48] rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
      {!recordedUrl ? (
        <>
          <div className="flex items-center gap-3">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-red-400">
                  REC {formatSec(recordDuration)}
                </span>
                <div className="flex items-center gap-1 h-4">
                  {[...Array(6)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 bg-red-500 rounded wave-bar"
                      style={{ animationDelay: `${i * 0.15}s`, height: `${Math.random() * 12 + 6}px` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400">Record a voice comment for this frame</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-900/20"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            )}
            <button
              onClick={handleDiscard}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition shadow"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Voice Note Ready</span>
              <span className="text-[10px] text-slate-400 font-mono">{formatSec(recordDuration)} recorded</span>
            </div>
            <audio
              ref={audioPlayerRef}
              src={recordedUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Discard Voice Note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attach Voice Note</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
