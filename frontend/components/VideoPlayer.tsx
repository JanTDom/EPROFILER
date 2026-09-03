"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
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
      </div>

      {/* Kontrolki odtwarzacza */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        {/* Pasek scrubbingu */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-700 rounded-none accent-blue-500 cursor-pointer"
        />

        <div className="flex items-center justify-between text-xs font-mono">
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

          <div className="flex items-center gap-2">
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
