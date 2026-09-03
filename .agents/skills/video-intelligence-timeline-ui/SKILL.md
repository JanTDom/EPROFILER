---
name: video-intelligence-timeline-ui
description: Frontend architecture, UX design, and real-time visualization engineering for video intelligence, behavioral profiling, and speech analysis web apps. Covers synchronized multi-track DAW/NLE timelines, frame-accurate video scrubbing, canvas waveform rendering, radar profiling charts, micro-expression inspectors, and intelligence studio UI aesthetics.
---

# Video Intelligence Timeline & Profiler UI Studio

This skill guides the construction of elite, broadcast/intelligence-grade web interfaces for reviewing video analysis, behavioral timelines, psychological dossiers, and rhetorical hotspots.

---

## 1. Visual & Architectural Philosophy: "Intelligence Studio"

Avoid generic SaaS dashboards. A video profiling workstation must feel like a precision forensics terminal:
* **Color Palette:** Deep, high-contrast matte surfaces (`#0a0d14`, `#121824`), muted structural borders (`#1e293b`), with surgical, semantic telemetry accents:
  * **Crimson (`#ef4444`):** High cognitive dissonance, deception cues, suppressed anger.
  * **Amber / Gold (`#f59e0b`):** Baseline deviation, acute stress spikes, evasive pivots.
  * **Cyan (`#06b6d4`):** Authentic engagement, baseline congruence, calm composure.
  * **Violet / Purple (`#8b5cf6`):** Dominance assertions, rhetorical power moves.
* **Density & Layout:** High information density with zero clutter. Primary split view:
  * Top-Left: Frame-accurate video player with overlay bounding boxes (gaze vector, face mesh).
  * Top-Right: Dynamic psychological dossier, radar trait plots, and active speaker metrics.
  * Bottom (Full-width): Multi-track synchronized chronological timeline.

```
┌─────────────────────────────────────────┬─────────────────────────────────────────┐
│              VIDEO STAGE                │          PSYCHOLOGICAL DOSSIER          │
│  ┌───────────────────────────────────┐  │  • Subject: Sen. John Doe               │
│  │                                   │  │  • Congruence Score: 42% [WARNING]      │
│  │   [ Video Frame + Face Mesh ]     │  │  • Dominance vs Warmth: High Dom / Low  │
│  │                                   │  │  ┌─────────────────┐  ┌───────────────┐ │
│  └───────────────────────────────────┘  │  │   Radar Plot    │  │ Stress Meter  │ │
│   [◄◄] [▶/⏸] [►►]  00:14:28.120 / 30fps │  │   (OCEAN/Dark)  │  │  78/100 (High)│ │
├─────────────────────────────────────────┴──┴─────────────────┴──┴───────────────┤
│ MULTI-TRACK SYNCHRONIZED TIMELINE                                 [Zoom: - | +] │
│ TRACK 1 (Speaker):    ██████████ (Interviewer)      ██████████████ (Subject)    │
│ TRACK 2 (Stress):     ───/\/\________/\/\/\/\/\/\/\________________/\/\________ │
│ TRACK 3 (Hotspots):        [DEFLECTION]           [MICRO-CONTEMPT]   [FEAR-TRIG]│
│ TRACK 4 (AUs):             |AU4|                   |AU14|            |AU1+AU4|  │
│ TRACK 5 (Transcript): "I have never... [SEEK] ...agreed to that particular fund"│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Synchronized Timeline Architecture (Zustand & Frame Accuracy)

Never bind timeline scrubbing directly to component-level `useState`. Use an optimized centralized store with decoupled animation loops:

```typescript
// stores/useVideoTimelineStore.ts
import { create } from 'zustand';

interface VideoTimelineState {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  playbackRate: number;
  activeMarkerId: string | null;
  zoomLevel: number; // pixels per second
  
  // Actions
  seekToMs: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setActiveMarker: (id: string | null) => void;
}

export const useVideoTimelineStore = create<VideoTimelineState>((set) => ({
  currentTimeMs: 0,
  durationMs: 0,
  isPlaying: false,
  playbackRate: 1.0,
  activeMarkerId: null,
  zoomLevel: 50, // 50px per second default

  seekToMs: (ms) => set({ currentTimeMs: ms }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setActiveMarker: (id) => set({ activeMarkerId: id }),
}));
```

---

## 3. High-Performance Canvas Timeline Track

Rendering hundreds of micro-expression markers, waveforms, and stress curves using standard DOM elements causes lag during playback. Use HTML5 Canvas with `requestAnimationFrame`:

```typescript
// components/timeline/StressCurveCanvas.tsx
import React, { useRef, useEffect } from 'react';

interface StressDataPoint {
  timeMs: number;
  stressLevel: number; // 0 to 100
}

export const StressCurveCanvas: React.FC<{
  data: StressDataPoint[];
  durationMs: number;
  currentTimeMs: number;
  width: number;
  height: number;
}> = ({ data, durationMs, currentTimeMs, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw baseline gradient line
    ctx.beginPath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height * 0.7);
    ctx.lineTo(width, height * 0.7);
    ctx.stroke();

    // Draw stress curve
    ctx.beginPath();
    ctx.lineWidth = 2;
    data.forEach((pt, i) => {
      const x = (pt.timeMs / durationMs) * width;
      const y = height - (pt.stressLevel / 100) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ef4444'); // high stress
    gradient.addColorStop(0.5, '#f59e0b');
    gradient.addColorStop(1, '#06b6d4'); // baseline
    ctx.strokeStyle = gradient;
    ctx.stroke();

    // Draw current playhead
    const playheadX = (currentTimeMs / durationMs) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }, [data, durationMs, currentTimeMs, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="w-full block" />;
};
```

---

## 4. Word-by-Word Synchronized Transcript Component

Interactive transcript allows clicking any word to jump video playback instantly, with live highlighting:

```tsx
// components/transcript/InteractiveTranscript.tsx
import React from 'react';
import { useVideoTimelineStore } from '@/stores/useVideoTimelineStore';

interface WordToken {
  word: string;
  startMs: number;
  endMs: number;
  speaker: string;
  stressScore?: number;
}

export const InteractiveTranscript: React.FC<{ words: WordToken[] }> = ({ words }) => {
  const { currentTimeMs, seekToMs } = useVideoTimelineStore();

  return (
    <div className="font-mono text-sm leading-relaxed p-4 bg-slate-950/80 rounded-lg border border-slate-800 overflow-y-auto max-h-80">
      {words.map((token, idx) => {
        const isActive = currentTimeMs >= token.startMs && currentTimeMs <= token.endMs;
        const isStressed = (token.stressScore ?? 0) > 70;

        return (
          <span
            key={idx}
            onClick={() => seekToMs(token.startMs)}
            className={`cursor-pointer px-1 py-0.5 rounded transition-colors inline-block mr-1 ${
              isActive
                ? 'bg-amber-400 text-black font-semibold ring-2 ring-amber-300'
                : isStressed
                ? 'text-red-400 underline decoration-red-500/50 decoration-wavy'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {token.word}
          </span>
        );
      })}
    </div>
  );
};
```

---

## 5. Micro-Expression & Hotspot Inspector Drawer

When a user clicks on an anomaly (e.g., "At 00:04:12 - Contempt Micro-Expression detected"), open a dedicated inspector modal/drawer:
* **Slow-Motion Loop:** Automatically loop the 300ms window at 0.25x speed.
* **Side-by-Side Face Crop:** Show the zoomed crop of the mouth/eyebrows with FACS annotations (AU14 Dimpler active).
* **Acoustic Waveform Snippet:** Show the synchronous pitch drop or vocal tremor.
* **Congruence Summary:** Detail the contradiction between the verbal claim and physiological reaction.

---

## 6. Pro NLE Keyboard Shortcuts (Forensic Productivity)

Implement broadcast editing hotkeys:
* `Space`: Play / Pause toggle
* `J`: Reverse scrub (tap for 1x, 2x, 4x reverse)
* `K`: Stop playback
* `L`: Forward scrub (tap for 1x, 2x, 4x forward)
* `Left / Right Arrow`: Step backward/forward exactly 1 video frame (33.3ms at 30fps)
* `Shift + Left / Right`: Jump to previous / next detected behavioral hotspot
* `I` / `O`: Set In/Out points to export a clipped report segment
