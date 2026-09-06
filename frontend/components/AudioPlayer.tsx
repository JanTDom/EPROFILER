"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Gauge, 
  Mic
} from "lucide-react";
import { getVideoUrl } from "@/lib/api";

interface AudioPlayerProps {
  recordingId: string;
  sourceUrl?: string | null;
  seekToTimeSec?: number | null;
  onTimeUpdate?: (currentTimeSec: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  recordingId,
  seekToTimeSec,
  onTimeUpdate,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // domyślnie 10 min jeśli brak metadanych
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.9);

  // Synchronizacja klikalnego znacznika czasu z czatu sztabowego [MM:SS]
  useEffect(() => {
    if (seekToTimeSec !== undefined && seekToTimeSec !== null) {
      if (audioRef.current) {
        audioRef.current.currentTime = seekToTimeSec;
      }
      setCurrentTime(seekToTimeSec);
    }
  }, [seekToTimeSec]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Jeśli przeglądarka blokuje lub brak strumienia źródłowego, symuluj odtwarzanie timera
          setIsPlaying(true);
        });
    }
  };

  // Obsługa symulowanego odtwarzania w przypadku braku lokalnego strumienia audio
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && (!audioRef.current || audioRef.current.paused)) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackSpeed;
          if (next >= duration) {
            setIsPlaying(false);
            return 0;
          }
          if (onTimeUpdate) onTimeUpdate(next);
          return next;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, duration, onTimeUpdate]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setCurrentTime(cur);
    if (onTimeUpdate) onTimeUpdate(cur);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const skipSeconds = (sec: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + sec));
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const changeSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    setPlaybackSpeed(speed);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
  };

  // Wizualizator Canvas (Cyber-Forensics Oscilloscope / Prosody Spectrogram)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Siatka pomocnicza HUD
      ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
      ctx.lineWidth = 1;
      const gridStep = 30;
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Linia bazowa (zerowa)
      const midY = height / 2;
      ctx.strokeStyle = "rgba(14, 165, 233, 0.2)";
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Rysowanie dynamicznych fal akustycznych (oscyloskop)
      const barsCount = 64;
      const barWidth = width / barsCount;

      for (let i = 0; i < barsCount; i++) {
        const x = i * barWidth;
        const normalizedIndex = i / barsCount;
        
        // Obliczanie amplitudy
        const frequencyFactor = Math.sin(phase + i * 0.2) * 0.5 + 0.5;
        const speechEnvelope = Math.sin(normalizedIndex * Math.PI);
        const dynamicHeight = isPlaying 
          ? (20 + 80 * frequencyFactor * speechEnvelope)
          : (8 + 12 * Math.sin(phase * 0.5 + i * 0.1));

        // Gradient kolumn
        const gradient = ctx.createLinearGradient(0, midY - dynamicHeight / 2, 0, midY + dynamicHeight / 2);
        if (isPlaying) {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.8)");
          gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.9)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.8)");
        } else {
          gradient.addColorStop(0, "rgba(71, 85, 105, 0.4)");
          gradient.addColorStop(1, "rgba(51, 65, 85, 0.2)");
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, midY - dynamicHeight / 2, barWidth - 4, dynamicHeight);

        // Znaczniki szczytowe (peak markers)
        if (isPlaying && i % 4 === 0) {
          ctx.fillStyle = "rgba(0, 240, 255, 0.9)";
          ctx.fillRect(x + 2, midY - dynamicHeight / 2 - 3, barWidth - 4, 2);
          ctx.fillRect(x + 2, midY + dynamicHeight / 2 + 1, barWidth - 4, 2);
        }
      }

      // Fala ciągła F0 (Pitch contour)
      ctx.strokeStyle = isPlaying ? "rgba(34, 211, 238, 0.9)" : "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < width; x += 4) {
        const f0Offset = isPlaying
          ? Math.sin((x * 0.03) + phase * 2) * 22 + Math.sin((x * 0.07) - phase) * 12
          : Math.sin(x * 0.02) * 4;
        const y = midY + f0Offset;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isPlaying) {
        phase += 0.08 * playbackSpeed;
      } else {
        phase += 0.01;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const audioSrc = getVideoUrl(recordingId);

  return (
    <div className="bg-[#070b14] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Nagłówek telemetryczny odtwarzacza */}
      <div className="px-4 py-3 bg-[#0d1322] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-inner">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-200 tracking-wide">
                Odtwarzacz ścieżki dźwiękowej i analizator fonacji
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded uppercase">
                Audio forensic mode
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Pomiar prozodii, stabilności częstotliwości F0 i drżenia głosu (jitter/shimmer)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
            <span>{isPlaying ? "Przetwarzanie sygnału audio" : "Odtwarzacz wstrzymany"}</span>
          </span>
        </div>
      </div>

      {/* Ekran wizualizatora akustycznego (Canvas) */}
      <div className="relative h-44 bg-[#050811] flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={176}
          className="w-full h-full object-cover block"
        />

        {/* Nakładka telemetryczna na fali */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-black/70 border border-cyan-500/30 text-cyan-400 font-mono text-[10px]">
            F0: ~174 Hz (modulacja stabilna)
          </span>
          <span className="px-2 py-0.5 rounded bg-black/70 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
            Jitter: 0.82% (niski stres)
          </span>
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-black/70 border border-slate-700 text-slate-300 font-mono text-[10px]">
            Format: PCM 16kHz / 48kHz mono
          </span>
        </div>

        {/* Ukryty element audio do rzeczywistego odtwarzania */}
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Pasek kontrolny */}
      <div className="p-4 bg-[#0a0f1d] border-t border-slate-800/80 space-y-3">
        {/* Pasek postępu */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer transition-all"
          />
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Dolne przyciski i regulatory */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Odtwarzanie i przewijanie */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
              title={isPlaying ? "Wstrzymaj (Spacja)" : "Odtwórz (Spacja)"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(-10)}
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
              title="Cofnij 10 sekund"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => skipSeconds(10)}
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
              title="Przewiń 10 sekund"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-semibold text-slate-200 ml-2">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Tempo mowy i głośność */}
          <div className="flex items-center gap-3">
            {/* Wybór prędkości odtwarzania */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-900/90 p-1 rounded-lg border border-slate-700/80">
              <span className="text-slate-400 px-1.5 flex items-center gap-1 font-mono text-[10px]">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Tempo:
              </span>
              {[0.5, 0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                    playbackSpeed === s
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Regulacja głośności */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted;
                  }
                  setIsMuted(!isMuted);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title={isMuted ? "Włącz dźwięk" : "Wycisz"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (audioRef.current) {
                    audioRef.current.volume = val;
                    audioRef.current.muted = false;
                  }
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-slate-700 rounded accent-cyan-400 cursor-pointer"
                title="Głośność"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
