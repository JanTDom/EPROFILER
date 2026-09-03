---
name: video-multimodal-ai-pipeline
description: Production-grade ingestion, audio/video processing, computer vision extraction, and multimodal AI analysis pipeline for video profiling applications. Covers FFmpeg transcoding, WhisperX word-level transcription, PyAnnote speaker diarization, Gemini 2.0 / 1.5 Pro multimodal video prompts, MediaPipe/Py-Feat face/gaze metrics, and BullMQ/Celery async worker queues.
---

# Video Multimodal AI & Processing Pipeline

This skill governs the end-to-end media engineering, machine learning pipelines, and background job orchestration required to turn raw video files into timestamped, structured profiling datasets.

---

## 1. High-Level Architecture

```
Raw Video (Upload / URL)
       │
       ▼
[ FFmpeg Ingestion & Normalization Worker ]
  ├── Proxy Video (720p H.264, Web-optimized, faststart)
  ├── Normalized Audio (16kHz Mono 16-bit PCM WAV)
  └── Keyframes (1–2 FPS for Visual LLM & Vision Feature Extractor)
       │
       ├───► [ WhisperX + PyAnnote Worker ]
       │        └── Word-level Timestamps + Speaker Diarization
       │
       ├───► [ Computer Vision & Prosody Worker (Local/Batch) ]
       │        ├── MediaPipe: Blink rate, Gaze vector, Head pose
       │        ├── Py-Feat / OpenFace: FACS Action Units per frame
       │        └── Librosa / OpenSMILE: F0 pitch, Jitter, Shimmer, Energy
       │
       └───► [ Multimodal LLM Profiling Worker (Gemini 2.0 / 1.5 Pro) ]
                └── Structured Timestamped Profiling, Intentions & Rhetoric
                         │
                         ▼
             [ Aggregation & Synthesis Engine ]
                         │
                         ▼
             [ Vector Store & Relational DB ]
```

---

## 2. Media Preprocessing & Normalization (FFmpeg)

Never pass unstandardized video directly to AI models or web frontends. Use deterministic FFmpeg workflows:

### A. Web Streaming Proxy (Fast scrubbing in browser)
```bash
ffmpeg -i input.mp4 -vf "scale=1280:-2" -c:v libx264 -preset fast -crf 23 \
  -movflags +faststart -c:a aac -b:a 128k output_proxy_720p.mp4
```

### B. High-Precision Audio Extraction for Speech & Prosody Models
```bash
# Extract 16kHz mono WAV for Whisper and acoustic prosody engines
ffmpeg -i input.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 output_audio_16k.wav
```

### C. Frame Extraction for Micro-Expression Inspection
```bash
# Extract keyframes at 4 FPS for micro-expression candidate detection
ffmpeg -i input.mp4 -vf "fps=4,scale=640:-2" -qscale:v 2 frames/frame_%06d.jpg
```

---

## 3. Speech Transcription & Speaker Diarization

High-grade profiling requires knowing **who** is speaking and the **exact millisecond** each word is uttered.

### Recommended Stack:
* **WhisperX** (faster-whisper backend + wav2vec2 phoneme alignment)
* **PyAnnote.Audio 3.1** for speaker clustering and boundary identification

```python
import whisperx
import gc

device = "cuda" if torch.cuda.is_available() else "cpu"
batch_size = 16
compute_type = "float16" if device == "cuda" else "int8"

# 1. Transcribe with WhisperX
model = whisperx.load_model("large-v3", device, compute_type=compute_type)
audio = whisperx.load_audio("output_audio_16k.wav")
result = model.transcribe(audio, batch_size=batch_size)

# 2. Align word-level timestamps
model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

# 3. Speaker Diarization (PyAnnote)
diarize_model = whisperx.DiarizationPipeline(use_auth_token="HF_TOKEN", device=device)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
```

---

## 4. Multimodal AI Profiling with Gemini 2.0 / 1.5 Pro

Gemini natively accepts video files and processes video frames alongside audio. Use structured system instructions and strict JSON Schema output to extract psychological insights.

### Gemini API Call Workflow:
```typescript
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Upload video to Gemini Files API
const uploadResult = await ai.files.upload({
  file: "output_proxy_720p.mp4",
  mimeType: "video/mp4",
});

// Wait for video processing active state
let file = await ai.files.get({ name: uploadResult.name });
while (file.state === "PROCESSING") {
  await new Promise((r) => setTimeout(r, 4000));
  file = await ai.files.get({ name: uploadResult.name });
}

// Call model with structured profiling prompt
const response = await ai.models.generateContent({
  model: "gemini-2.5-pro",
  contents: [
    {
      fileData: {
        fileUri: file.uri,
        mimeType: file.mimeType,
      },
    },
    {
      text: `Act as a senior behavioral psychologist, forensic profiler, and political discourse analyst.
Analyze the primary subject in this video. Provide millisecond-accurate timestamped events tracking:
1. Emotion shifts and micro-expressions (Ekman FACS indicators).
2. Intentions (dominance, evasion, appeasement, provocation).
3. Hotspots where verbal claims contradict non-verbal cues (cognitive dissonance).
4. Vulnerabilities, fears, and moments of psychological strain.
5. Detected rhetorical tactics (deflection, whataboutism, ad hominem).`,
    },
  ],
  config: {
    responseMimeType: "application/json",
    responseSchema: ProfilingAnalysisSchema, // Zod / JSON Schema
  },
});
```

---

## 5. Local Computer Vision & Prosody Extraction (Py-Feat & Librosa)

For deep forensic accuracy beyond LLM inference, run deterministic extractors:

### A. Facial Action Units & Emotion (Py-Feat)
```python
from feat import Detector

detector = Detector(
    face_model="retinaface",
    landmark_model="mobilenet",
    au_model="svm",
    emotion_model="resmasknet"
)
video_prediction = detector.detect_video("output_proxy_720p.mp4", skip_frames=5)
# Outputs pandas DataFrame with AU1-AU43 intensities, valence, arousal per frame
```

### B. Vocal Stress & Pitch Jitter/Shimmer (Librosa / Praat-Parselmouth)
```python
import parselmouth
from parselmouth.praat import call

sound = parselmouth.Sound("output_audio_16k.wav")
pitch = sound.to_pitch()
point_process = call(sound, "To PointProcess (periodic, cc)", 75, 500)

jitter = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
shimmer = call([sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
mean_f0 = call(pitch, "Get mean", 0, 0, "Hertz")
```

---

## 6. Asynchronous Worker Architecture (BullMQ / Redis)

Media processing cannot run in an HTTP request handler. Implement a resilient queue:

```typescript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);
export const profilingQueue = new Queue('video-profiling', { connection });

// Multi-stage pipeline job
export const profilingWorker = new Worker('video-profiling', async (job) => {
  const { videoId, videoPath } = job.data;
  
  await job.updateProgress({ step: 'TRANSCODING', percent: 10 });
  const proxyPath = await transcodeProxy(videoPath);
  
  await job.updateProgress({ step: 'DIARIZATION', percent: 35 });
  const transcript = await runWhisperDiarization(proxyPath);
  
  await job.updateProgress({ step: 'PROFILING_LLM', percent: 70 });
  const analysis = await runMultimodalAnalysis(proxyPath, transcript);
  
  await job.updateProgress({ step: 'AGGREGATION', percent: 95 });
  await saveProfileToDatabase(videoId, analysis);
  
  return { status: 'COMPLETED', videoId };
}, { connection, concurrency: 2 });
```

---

## 7. Performance & Cost Optimization Rules
* **Proxy First:** Never send a 4K 60fps raw file to cloud APIs; generate a 720p 24fps high-efficiency stream proxy to cut payload size by ~85%.
* **Selective Sampling:** If analyzing 2-hour hearings, segment into conversational turns or extract candidate conflict windows (using audio volume spikes and rapid turn-taking) rather than processing full unedited streams in one shot.
* **Cache Intermediate Artifacts:** Retain the `.wav` and word-level JSON transcript locally so re-running profiling models doesn't require re-transcribing.
