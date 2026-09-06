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
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { getVideoUrl } from "@/lib/api";

function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export const VideoPlayer: React.FC<{
  recordingId: string;
  sourceUrl?: string | null;
  sourceType?: string | null;
  onTimeUpdate?: (currentTimeSec: number) => void;
  seekToTimeSec?: number | null;
}> = ({ recordingId, sourceUrl, sourceType, onTimeUpdate, seekToTimeSec }) => {
  const ytId = extractYouTubeId(sourceUrl);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Synchronizacja z przewijaniem do zadanego znacznika czasu
  useEffect(() => {
    if (seekToTimeSec !== undefined && seekToTimeSec !== null) {
      if (ytId && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [seekToTimeSec, true],
          }),
          "*"
        );
      } else if (videoRef.current) {
        videoRef.current.currentTime = seekToTimeSec;
      }
      setCurrentTime(seekToTimeSec);
    }
  }, [seekToTimeSec, ytId]);

  // Dla odtwarzacza YouTube: zmiana prędkości przez postMessage
  const changeYtSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setPlaybackRate",
          args: [speed],
        }),
        "*"
      );
    }
  };

  const skipYtSeconds = (delta: number) => {
    const target = Math.max(0, currentTime + delta);
    setCurrentTime(target);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [target, true],
        }),
        "*"
      );
    }
  };

  // Obsługa HTML5 video (pliki lokalne / wgrane)
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);
    if (onTimeUpdate) onTimeUpdate(cur);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipSeconds = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + sec));
    }
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms}`;
  };

  // 1. Jeśli to wideo z YouTube:
  if (ytId) {
    const initialStart = seekToTimeSec ? Math.floor(seekToTimeSec) : 0;
    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&rel=0&playsinline=1${initialStart ? `&start=${initialStart}` : ""}`;

    return (
      <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Pasek statusu źródła YouTube */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-slate-200">
              Odtwarzacz materiału źródłowego (YouTube)
            </span>
            {playbackSpeed < 1.0 && (
              <span className="bg-red-600/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
                Tryb mikroekspresji: {playbackSpeed}x
              </span>
            )}
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Otwórz na YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Kontener iframe YouTube 16:9 */}
        <div className="relative aspect-video bg-black w-full">
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="Podgląd materiału wideo"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Pasek kontrolny dla analizy i zwolnionego tempa */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => skipYtSeconds(-5)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-colors"
              title="Cofnij o 5 sekund"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-5s</span>
            </button>
            <button
              type="button"
              onClick={() => skipYtSeconds(5)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition-colors"
              title="Przewiń o 5 sekund w przód"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+5s</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyan-400" />
              Tempo mikroekspresji:
            </span>
            {[0.25, 0.5, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeYtSpeed(s)}
                className={`px-2 py-1 rounded transition-colors ${
                  playbackSpeed === s
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
                title={s === 0.25 ? "Zwolnione tempo 0.25x — inspekcja grymasów FACS" : `${s}x`}
              >
                {s === 0.25 ? "0.25x (FACS)" : `${s}x`}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. Jeśli to plik lokalny lub wgrany:
  const videoSrc = getVideoUrl(recordingId);

  return (
    <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {hasVideoError ? (
          <div className="p-6 text-center space-y-2">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">
              Podgląd wideo niedostępny bezpośrednio w strumieniu
            </p>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded-lg transition-colors font-mono"
              >
                <span>Otwórz materiał źródłowy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setHasVideoError(true)}
            playsInline
          />
        )}

        {playbackSpeed < 1.0 && !hasVideoError && (
          <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
            Tryb mikroekspresji: {playbackSpeed}x
          </div>
        )}
      </div>

      {/* Kontrolki odtwarzacza */}
      {!hasVideoError && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-none accent-blue-500 cursor-pointer"
          />

          <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                title={isPlaying ? "Pauza (Spacja)" : "Odtwórz (Spacja)"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => skipSeconds(-5)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Cofnij 5 sekund"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => skipSeconds(5)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Przewiń 5 sekund"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <span className="text-slate-300 ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] bg-slate-800/80 p-0.5 rounded border border-slate-700">
                <span className="text-slate-400 px-1 flex items-center gap-0.5">
                  <Gauge className="w-3 h-3" />
                  Tempo:
                </span>
                {[0.25, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSpeed(s)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      playbackSpeed === s
                        ? "bg-blue-600 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title={s === 0.25 ? "Zwolnione tempo 0.25x — inspekcja mikroekspresji twarzy" : `${s}x`}
                  >
                    {s === 0.25 ? "0.25x (FACS)" : `${s}x`}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
