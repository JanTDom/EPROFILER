"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Gauge } from "lucide-react";
import { getVideoUrl } from "@/lib/api";

export const VideoPlayer: React.FC<{
  recordingId: string;
  onTimeUpdate?: (currentTimeSec: number) => void;
  seekToTimeSec?: number | null;
}> = ({ recordingId, onTimeUpdate, seekToTimeSec }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  useEffect(() => {
    if (seekToTimeSec !== undefined && seekToTimeSec !== null && videoRef.current) {
      videoRef.current.currentTime = seekToTimeSec;
    }
  }, [seekToTimeSec]);

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

  const videoSrc = getVideoUrl(recordingId);

  return (
    <div className="bg-slate-950 text-white border border-slate-800 overflow-hidden shadow-sm">
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />

        {playbackSpeed < 1.0 && (
          <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow">
            TRYB MIKROEKSPRESJI: {playbackSpeed}x
          </div>
        )}
      </div>

      {/* Kontrolki odtwarzacza */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        {/* Pasek scrubbingu */}
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
              onClick={togglePlay}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title={isPlaying ? "Pauza (Spacja)" : "Odtwórz (Spacja)"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => skipSeconds(-5)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Cofnij 5 sekund"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
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
            {/* Wybór prędkości (zwolnione tempo dla mikroekspresji) */}
            <div className="flex items-center gap-1 text-[11px] bg-slate-800/80 p-0.5 rounded border border-slate-700">
              <span className="text-slate-400 px-1 flex items-center gap-0.5">
                <Gauge className="w-3 h-3" />
                Tempo:
              </span>
              {[0.25, 0.5, 1.0].map((s) => (
                <button
                  key={s}
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
    </div>
  );
};
