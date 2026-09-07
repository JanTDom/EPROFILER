"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Link2, 
  Upload, 
  Loader2, 
  ArrowRight, 
  Eye, 
  Sparkles, 
  UserCheck, 
  MonitorPlay, 
  Square, 
  RotateCcw,
  Radio,
  ShieldCheck,
  Film,
  ExternalLink,
  AlertCircle,
  Puzzle,
  Download,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Mic,
  Target,
  Volume2,
  VolumeX,
  AlertTriangle
} from "lucide-react";
import { createRecordingFromUrl, uploadRecordingFile, sanitizeVideoUrl } from "@/lib/api";
import { RecordingType, PoliticianRelation } from "@/lib/types";
import { getClientProfile, getClientCustomGeminiKey } from "@/lib/profile";
import { LegalNotice } from "./LegalNotice";

export const IngestForm: React.FC = () => {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "file" | "screen">("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profil
  const [activeProfile, setActiveProfile] = useState<string>("profile_main");

  useEffect(() => {
    setActiveProfile(getClientProfile());
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlParam = sp.get("url");
      const polParam = sp.get("polityk");
      const relParam = sp.get("relacja");
      if (urlParam) setUrl(urlParam);
      if (polParam) setTargetPolitician(polParam);
      if (relParam === "przeciwnik" || relParam === "sojusznik") {
        setPoliticianRelation(relParam as PoliticianRelation);
      }
    }
  }, []);

  // Pola formularza
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("");
  const [politicianRole, setPoliticianRole] = useState("Badany polityk");
  const [politicianRelation, setPoliticianRelation] = useState<PoliticianRelation>("sojusznik");
  const [recordingType, setRecordingType] = useState<RecordingType>("wywiad");
  const [publicationDate, setPublicationDate] = useState("");
  const [enableBiometrics, setEnableBiometrics] = useState(true);
  const [analysisScope, setAnalysisScope] = useState<"pelny" | "behawioralny">("pelny");

  // Asystent VOD & Rejestrator DRM
  const [vodUrl, setVodUrl] = useState("");
  const [vodTabOpened, setVodTabOpened] = useState(false);
  const [showExtensionGuide, setShowExtensionGuide] = useState(false);

  // Stan przechwytywania z ekranu / karty (Bypass DRM)
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSeconds, setCaptureSeconds] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [audioSourceMode, setAudioSourceMode] = useState<"tab" | "mic" | "both">("tab");
  const [hasAudioTrack, setHasAudioTrack] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);
  const [recordedHasAudio, setRecordedHasAudio] = useState<boolean | null>(null);
  const [showDrmGuide, setShowDrmGuide] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);

  // Czyszczenie zasobów przy odmontowaniu komponentu
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startScreenCapture = async (sourceModeOverride?: "tab" | "mic" | "both") => {
    try {
      setError(null);
      setAudioWarning(null);
      setAudioLevel(0);
      const chosenMode = sourceModeOverride || audioSourceMode;

      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Twoja przeglądarka nie obsługuje przechwytywania ekranu/karty.");
      }

      // 1. Pobierz obraz (i opcjonalnie dźwięk z karty w oknie wyboru)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" as any },
        audio: chosenMode !== "mic",
      });

      mediaStreamRef.current = displayStream;

      const displayAudioTracks = displayStream.getAudioTracks();
      let finalAudioTracks: MediaStreamTrack[] = [];
      let trackForMeter: MediaStreamTrack | null = null;

      // 2. Obsługa mikrofonu lub trybu łączonego (karta + mikrofon)
      if (chosenMode === "mic" || chosenMode === "both") {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const micAudioTracks = micStream.getAudioTracks();

          if (chosenMode === "both" && displayAudioTracks.length > 0) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const dest = audioCtx.createMediaStreamDestination();

            const tabSource = audioCtx.createMediaStreamSource(new MediaStream(displayAudioTracks));
            const micSource = audioCtx.createMediaStreamSource(micStream);
            tabSource.connect(dest);
            micSource.connect(dest);

            const mixedTrack = dest.stream.getAudioTracks()[0];
            finalAudioTracks = [mixedTrack];
            trackForMeter = mixedTrack;
          } else {
            finalAudioTracks = micAudioTracks;
            trackForMeter = micAudioTracks[0] || null;
          }
        } catch (micErr: any) {
          console.warn("Błąd mikrofonu:", micErr);
          if (chosenMode === "mic") {
            displayStream.getTracks().forEach((t) => t.stop());
            throw new Error("Brak dostępu do mikrofonu: " + (micErr.message || "Udziel uprawnień w przeglądarce."));
          }
          finalAudioTracks = displayAudioTracks;
          trackForMeter = displayAudioTracks[0] || null;
        }
      } else {
        // Tylko karta
        finalAudioTracks = displayAudioTracks;
        trackForMeter = displayAudioTracks[0] || null;
      }

      // Jeśli karta nie ma ścieżki audio, automatycznie ratujemy nagranie mikrofonem komputera!
      if (finalAudioTracks.length === 0) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          finalAudioTracks = micStream.getAudioTracks();
          trackForMeter = finalAudioTracks[0] || null;
          setAudioWarning(
            "Nie zaznaczono dźwięku karty, więc system automatycznie włączył mikrofon (dźwięk nagrywa się z głośników komputera)!"
          );
        } catch {
          setAudioWarning(
            "Uwaga: Nagrywasz BEZ GŁOSU! W oknie wyboru karty nie zaznaczono opcji 'Udostępnij dźwięk z karty'."
          );
        }
      }

      const audioDetected = finalAudioTracks.length > 0;
      setHasAudioTrack(audioDetected);

      // 3. Połączony strumień rejestrowany
      const combinedTracks = [
        ...displayStream.getVideoTracks(),
        ...finalAudioTracks,
      ];
      const combinedStream = new MediaStream(combinedTracks);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = combinedStream;
      }

      // 4. Miernik głośności VU w czasie rzeczywistym
      if (trackForMeter) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            audioContextRef.current = new AudioContextClass();
          }
          const audioCtx = audioContextRef.current;
          if (audioCtx.state === "suspended") {
            await audioCtx.resume();
          }
          const source = audioCtx.createMediaStreamSource(new MediaStream([trackForMeter]));
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round(avg * 2.5)));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch (visErr) {
          console.warn("Błąd inicjalizacji analizatora audio:", visErr);
        }
      } else {
        setAudioLevel(0);
      }

      // 5. Recorder
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 350000, // 350 kbps — optymalna kompresja dla AI, 1 min = ~2.6 MB (mieści się w limicie 4.5 MB Vercel)
        audioBitsPerSecond: 64000,  // 64 kbps — krystaliczna czystość dźwięku mowy
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setCapturedBlob(blob);
        setCapturedUrl(URL.createObjectURL(blob));
        setRecordedHasAudio(audioDetected);
        combinedStream.getTracks().forEach((track) => track.stop());
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((track) => track.stop());
          micStreamRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        setAudioLevel(0);
      };

      if (displayStream.getVideoTracks()[0]) {
        displayStream.getVideoTracks()[0].onended = () => {
          stopScreenCapture();
        };
      }

      recorder.start(1000);
      setIsCapturing(true);
      setCaptureSeconds(0);
      timerRef.current = setInterval(() => {
        setCaptureSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError(`Nie udało się uruchomić przechwytywania: ${err.message}`);
      }
    }
  };

  const stopScreenCapture = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsCapturing(false);
  };

  const resetScreenCapture = () => {
    stopScreenCapture();
    setCapturedBlob(null);
    setRecordedHasAudio(null);
    setHasAudioTrack(null);
    setAudioWarning(null);
    setAudioLevel(0);
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    setCaptureSeconds(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const profileId = getClientProfile();
    const customKey = getClientCustomGeminiKey() || undefined;

    try {
      if (tab === "url") {
        if (!url.trim()) {
          throw new Error("Wklej poprawny adres URL do nagrania.");
        }
        const cleanUrl = sanitizeVideoUrl(url);
        const created = await createRecordingFromUrl({
          url: cleanUrl,
          tytul: title.trim() || undefined,
          typ_nagrania: recordingType,
          data_publikacji: publicationDate || undefined,
          tryb_biometryczny: enableBiometrics,
          zakres_analizy: analysisScope,
          polityk_docelowy: targetPolitician.trim() || undefined,
          rola_polityka: politicianRole,
          relacja_polityka: politicianRelation,
          profile_id: profileId,
          gemini_api_key: customKey,
        });
        router.push(`/recordings/${created.id}`);
      } else if (tab === "file") {
        if (!selectedFile) {
          throw new Error("Wybierz plik wideo lub audio z dysku.");
        }
        const isAudio = selectedFile.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|opus|wma)$/i.test(selectedFile.name);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("format_materialu", isAudio ? "audio" : "wideo");
        if (title.trim()) formData.append("tytul", title.trim());
        formData.append("typ_nagrania", recordingType);
        if (publicationDate) formData.append("data_publikacji", publicationDate);
        formData.append("tryb_biometryczny", enableBiometrics ? "true" : "false");
        formData.append("zakres_analizy", analysisScope);
        formData.append("profile_id", profileId);
        if (targetPolitician.trim()) formData.append("polityk_docelowy", targetPolitician.trim());
        formData.append("rola_polityka", politicianRole);
        formData.append("relacja_polityka", politicianRelation);
        if (customKey) formData.append("gemini_api_key", customKey);

        const created = await uploadRecordingFile(formData);
        router.push(`/recordings/${created.id}`);
      } else {
        // Tab: "screen"
        if (!capturedBlob) {
          throw new Error("Najpierw nagraj fragment wideo z karty/odtwarzacza.");
        }
        const fileFromBlob = new File([capturedBlob], "przechwycenie_vod.webm", { type: capturedBlob.type });
        const formData = new FormData();
        formData.append("file", fileFromBlob);
        formData.append("tytul", title.trim() || `Przechwycenie VOD (${new Date().toLocaleDateString()})`);
        formData.append("typ_nagrania", recordingType);
        if (publicationDate) formData.append("data_publikacji", publicationDate);
        formData.append("tryb_biometryczny", enableBiometrics ? "true" : "false");
        formData.append("zakres_analizy", analysisScope);
        formData.append("profile_id", profileId);
        if (targetPolitician.trim()) formData.append("polityk_docelowy", targetPolitician.trim());
        formData.append("rola_polityka", politicianRole);
        formData.append("relacja_polityka", politicianRelation);
        if (customKey) formData.append("gemini_api_key", customKey);

        const created = await uploadRecordingFile(formData);
        router.push(`/recordings/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas wprowadzania materiału.");
      setLoading(false);
    }
  };

  const isCustom = activeProfile === "profile_custom";

  return (
    <div className="relative max-w-2xl mx-auto bg-studio-card/85 border border-studio-border/80 p-7 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-500 before:to-emerald-400">
      {/* Narożniki HUD */}
      <div className="absolute top-3 left-3 w-2 h-2 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-2 h-2 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-2 h-2 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-2 h-2 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/60 px-2.5 py-1 border border-cyan-500/40 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            E-PROFILER FORENSICS LAB
          </span>
          {isCustom ? (
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2.5 py-0.5 border border-purple-500/50 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              ZAPIS W PROFILU NIEZALEŻNYM (WŁASNE API)
            </span>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 border border-emerald-500/40 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ZAPIS W PROFILU GŁÓWNYM
            </span>
          )}
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-500/30 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Język zrozumiały dla każdego
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Wprowadź materiał do profilowania
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Wybierz link z sieci, plik z dysku lub bezpośrednie przechwytywanie z karty odtwarzacza (np. TVN24, VOD, Sejm), aby przeprowadzić multimodalną analizę behawioralną.
        </p>
      </div>

      {/* Wybór metody wprowadzania (3 zakładki) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-studio-border/80 mb-6 bg-studio-surface/50 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all ${
            tab === "url"
              ? "bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Link URL</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all ${
            tab === "file"
              ? "bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Plik (wideo / audio)</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("screen")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all ${
            tab === "screen"
              ? "bg-purple-500/25 border border-purple-500/70 text-purple-200 shadow-sm"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <MonitorPlay className="w-3.5 h-3.5 text-purple-400" />
          <span>Karta / DRM (VOD)</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-ping" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Zakładka 1: Link URL */}
        {tab === "url" && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Adres URL nagrania *</span>
              <span className="text-[10px] text-slate-500 font-mono">YouTube, wywiad, debata</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 font-mono transition-all"
            />
          </div>
        )}

        {/* Zakładka 2: Plik z dysku (wideo lub audio) */}
        {tab === "file" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Wybierz plik z dysku (wideo lub audio) *</span>
                <span className="text-[10px] text-slate-500 font-mono">MP4, WEBM, MOV, MP3, WAV, M4A, OGG, FLAC</span>
              </label>
              <input
                type="file"
                required
                accept="video/*,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus,.wma"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-slate-200 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            {selectedFile && (() => {
              const isAudio = selectedFile.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|opus|wma)$/i.test(selectedFile.name);
              return (
                <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  isAudio 
                    ? "bg-amber-950/40 border-amber-500/50 text-amber-200"
                    : "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {isAudio ? (
                      <>
                        <Mic className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>Wykryto plik audio (podcast / wywiad radiowy)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span>Wykryto plik wideo (analiza multimodalna)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isAudio
                      ? "Silnik skupi się w 100% na akustyce głosu, prozodii, intonacji, drżeniu głosu oraz treści merytorycznej (bez wymyślania mimiki twarzy)."
                      : "Silnik dokona pełnej analizy mimiki twarzy FACS, kontaktu wzrokowego, mowy ciała oraz ścieżki dźwiękowej."}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ZAKŁADKA 3: ASYSTENT VOD / STRONY CHRONIONE DRM */}
        {tab === "screen" && (
          <div className="p-4 bg-[#0d121f] border border-purple-800/60 rounded-xl space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-purple-900/40">
              <span className="text-xs font-bold text-purple-200 flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-purple-400" />
                <span>Asystent VOD i Rejestrator Karty (Bypass DRM)</span>
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-purple-300 bg-purple-950/80 px-2 py-0.5 border border-purple-700/60 rounded">
                  TVN24 • TVP VOD • POLSAT • SEJM
                </span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/50 rounded">
                  WIDEVINE OK
                </span>
              </div>
            </div>

            {/* INTELIGENTNA ALTERNATYWA: CZY TO YOUTUBE / PORTAL? */}
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-xs flex items-start gap-2.5 text-cyan-200">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Wolisz prostsze rozwiązanie bez nagrywania ekranu?</span>
                  <span className="bg-cyan-500/20 text-cyan-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/40">ZALECANE</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Dla filmów z <strong>YouTube, Twittera/X, Onetu, TVP, Sejmu czy Facebooka</strong> nie musisz w ogóle nagrywać ekranu! 
                  Przełącz się na zakładkę{" "}
                  <button
                    type="button"
                    onClick={() => setTab("url")}
                    className="text-cyan-400 underline font-bold hover:text-cyan-200 cursor-pointer"
                  >
                    Adres URL nagrania
                  </button>{" "}
                  i po prostu wklej link — serwer pobierze wideo automatycznie w najwyższej jakości z krystalicznym dźwiękiem.
                </p>
              </div>
            </div>

            {/* KROK 1: WPROWADŹ LINK I OTWÓRZ W NOWEJ KARCIE */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">1</span>
                  <span>Podaj adres strony z wideo i otwórz ją w nowej karcie:</span>
                </span>
                <span className="text-[10px] text-purple-400 font-mono">Serwis VOD / Portal informacyjny</span>
              </label>
              
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="np. https://tvn24.pl/... lub https://vod.tvp.pl/..."
                  value={vodUrl}
                  onChange={(e) => setVodUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs bg-[#0b101b] border border-purple-900/60 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!vodUrl.trim()) {
                      setError("Wpisz adres strony z materiałem VOD.");
                      return;
                    }
                    window.open(vodUrl.trim(), "_blank");
                    setVodTabOpened(true);
                    setError(null);
                  }}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Otwórz wideo</span>
                </button>
              </div>

              {/* Sygnalizacja logowania i odtwarzania */}
              {vodTabOpened && (
                <div className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-lg text-xs space-y-1.5 text-purple-200 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Karta została otwarta w nowym oknie przeglądarki!</span>
                  </div>
                  <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                    1. <strong>Logowanie:</strong> Jeśli strona wymaga logowania lub subskrypcji — zaloguj się na swoje konto.<br />
                    2. <strong>Odtwarzanie:</strong> Uruchom odtwarzanie materiału wideo i wycisz zbędne karty.<br />
                    3. <strong>Wybierz źródło dźwięku poniżej</strong> i kliknij przycisk nagrywania.
                  </p>
                </div>
              )}
            </div>

            {/* KROK 2: WYBÓR ŹRÓDŁA DŹWIĘKU */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">2</span>
                  <span>Wybierz źródło dźwięku (rozwiązanie problemu braku głosu):</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400">Audio Guard</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAudioSourceMode("tab")}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    audioSourceMode === "tab"
                      ? "bg-purple-950/80 border-purple-500 text-white shadow-md shadow-purple-950/50"
                      : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Dźwięk karty</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Czysty dźwięk z odtwarzacza wideo. Wymaga zaznaczenia opcji audio w oknie Chrome.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioSourceMode("mic")}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    audioSourceMode === "mic"
                      ? "bg-amber-950/80 border-amber-500 text-white shadow-md shadow-amber-950/50"
                      : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mikrofon komputera</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Niezawodny! Zbiera dźwięk z głośników laptopa / telewizora. Zero problemów z ustawieniami karty.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioSourceMode("both")}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    audioSourceMode === "both"
                      ? "bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-950/50"
                      : "bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Karta + Mikrofon</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Miks obu ścieżek naraz — słychać zarówno wideo, jak i Twój komentarz na żywo.
                  </p>
                </button>
              </div>
            </div>

            {/* KROK 3: PRZECHWYĆ I NAGRAJ Z PODGLĄDEM I VU-METEREM */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-mono text-[10px] flex items-center justify-center font-bold">3</span>
                <span>Zarejestruj fragment z odtwarzacza:</span>
              </label>

              {/* Stan 2A: Przed nagraniem */}
              {!isCapturing && !capturedBlob && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => startScreenCapture()}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MonitorPlay className="w-4 h-4" />
                    <span>Wybierz kartę i rozpocznij nagrywanie</span>
                  </button>

                  <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>Kluczowa wskazówka, aby głos się na pewno nagrał:</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed pl-5">
                      W wyskakującym okienku przeglądarki Chrome wybierz zakładkę <strong>„Karta Chrome”</strong> (nie „Cały ekran”) i zaznacz na dole przełącznik <strong>„Udostępnij dźwięk z karty”</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Stan 2B: Trwa nagrywanie z LIVE VU-METEREM */}
              {isCapturing && (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border-2 border-red-500/80 bg-black aspect-video flex items-center justify-center shadow-2xl">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 bg-red-600 text-white font-mono font-bold text-xs px-3 py-1 rounded-md flex items-center gap-2 animate-pulse shadow-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      <span>REC // {formatTimer(captureSeconds)}</span>
                    </div>
                  </div>

                  {/* ŻYWY MIERNIK DŹWIĘKU (VU-METER) */}
                  <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        {hasAudioTrack ? (
                          audioLevel > 3 ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                              <span>GŁOS WYKRYTY (Rejestrowanie sygnału audio...)</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <Volume2 className="w-4 h-4 text-amber-400" />
                              <span>Oczekiwanie na dźwięk (włącz odtwarzanie w wideo)</span>
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 font-bold">
                            <VolumeX className="w-4 h-4 text-red-400" />
                            <span>BRAK ŚCIEŻKI AUDIO — DŹWIĘK NIE JEST REJESTROWANY!</span>
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400">{hasAudioTrack ? `${audioLevel}%` : "0%"}</span>
                    </div>

                    {/* Słupek głośności VU */}
                    <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-75 ${
                          !hasAudioTrack
                            ? "bg-red-600 w-full"
                            : audioLevel > 70
                            ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500"
                            : audioLevel > 15
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-emerald-500/30"
                        }`}
                        style={{ width: hasAudioTrack ? `${Math.max(4, audioLevel)}%` : "100%" }}
                      />
                    </div>

                    {audioWarning && (
                      <div className="p-2 bg-amber-950/60 border border-amber-500/40 rounded text-[11px] text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{audioWarning}</span>
                      </div>
                    )}

                    {/* Alert ratunkowy, jeśli nie ma audio */}
                    {!hasAudioTrack && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-red-900/30">
                        <span className="text-[11px] text-red-300">
                          Zapomniano zaznaczyć „Udostępnij dźwięk z karty” w oknie Chrome.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            stopScreenCapture();
                            setAudioSourceMode("mic");
                            setTimeout(() => startScreenCapture("mic"), 400);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>Przełącz teraz na mikrofon</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={stopScreenCapture}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-xl cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Zakończ nagrywanie ({formatTimer(captureSeconds)}) i przejdź do analizy</span>
                  </button>
                </div>
              )}

              {/* Stan 2C: Nagrano materiał z weryfikacją dźwięku */}
              {!isCapturing && capturedBlob && (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-emerald-500/60 bg-black aspect-video flex items-center justify-center">
                    <video
                      src={capturedUrl || undefined}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Status audio i rozmiar pliku w nagranym materiale */}
                  {(() => {
                    const sizeMb = capturedBlob ? (capturedBlob.size / (1024 * 1024)).toFixed(1) : "0";
                    const isExceeding = capturedBlob ? capturedBlob.size > 4.2 * 1024 * 1024 : false;
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {recordedHasAudio ? (
                                <div className="flex items-center gap-1.5 text-emerald-300">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>Zarejestrowano wideo i dźwięk: <strong>{formatTimer(captureSeconds)}</strong> (waga: {sizeMb} MB)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-300">
                                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                                  <span>Zarejestrowano wideo: <strong>{formatTimer(captureSeconds)}</strong> (brak audio — zalecamy nagrać z dźwiękiem)</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isExceeding ? (
                                <span className="text-amber-400 font-bold">
                                  ⚠️ Plik waży {sizeMb} MB (limit chmury: 4.2 MB). Rekomendujemy nagranie fragmentu do 1–1.5 minuty, aby audyt przeszedł pomyślnie.
                                </span>
                              ) : (
                                <span className="text-emerald-400">
                                  ✅ Rozmiar pliku ({sizeMb} MB) idealnie zoptymalizowany pod szybki audyt AI w chmurze.
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={resetScreenCapture}
                            className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 underline transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Nagraj ponownie
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* SEKCJA: CZARNY EKRAN W VOD / OCHRONA DRM W CHROME */}
            <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl text-xs space-y-2">
              <button
                type="button"
                onClick={() => setShowDrmGuide(!showDrmGuide)}
                className="w-full flex items-center justify-between font-bold text-purple-200 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Czarny ekran lub blokada w TVN24 / VOD? Jak odblokować w 15 sekund</span>
                </span>
                {showDrmGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDrmGuide && (
                <div className="pt-2 text-[11px] text-purple-200 space-y-2 border-t border-purple-800/50 leading-relaxed animate-fadeIn">
                  <p className="text-slate-300">
                    Serwisy VOD (np. TVN24 GO, Canal+, Polsat Box Go, TVP VOD) stosują zabezpieczenie DRM (Widevine). Kiedy przeglądarka korzysta ze sprzętowej akceleracji grafiki, nagrywany obraz staje się czarny.
                  </p>
                  <div className="bg-black/60 p-3 rounded-lg border border-purple-700/50 space-y-1.5 font-mono text-[11px] text-purple-200">
                    <div><strong>1.</strong> Wpisz w pasku adresu przeglądarki Chrome/Edge: <code className="text-cyan-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">chrome://settings/system</code></div>
                    <div><strong>2.</strong> Wyłącz opcję: <strong>„Użyj akceleracji graficznej, gdy jest dostępna”</strong> (Hardware acceleration).</div>
                    <div><strong>3.</strong> Kliknij <strong>Uruchom ponownie</strong> obok tej opcji w Chrome.</div>
                  </div>
                  <p className="text-emerald-300 text-[10px] font-bold">
                    ✨ Po tym prostym zabiegu żaden serwis VOD nie wyświetli już czarnego ekranu przy nagrywaniu karty!
                  </p>
                </div>
              )}
            </div>

            {/* OPCJA B: ROZSZERZENIE CHROME / EDGE */}
            <div className="p-3.5 bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center flex-shrink-0">
                    <Puzzle className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Rozszerzenie E-PROFILER dla Chrome / Edge</span>
                      <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded">
                        NOWOŚĆ
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Wykrywa wideo na dowolnej stronie i profiluje 1 kliknięciem bez przełączania kart.
                    </p>
                  </div>
                </div>
                
                <a
                  href="/eprofiler-chrome-extension.zip"
                  download="eprofiler-chrome-extension.zip"
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pobierz .ZIP</span>
                </a>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowExtensionGuide(!showExtensionGuide)}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Info className="w-3 h-3 text-cyan-400" />
                  <span>Jak zainstalować w 30 sekund w Chrome/Edge?</span>
                  {showExtensionGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showExtensionGuide && (
                  <ol className="mt-2 text-[11px] text-slate-300 space-y-1 pl-4 list-decimal leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <li>Pobierz i wypakuj plik <code>eprofiler-chrome-extension.zip</code> na dysku.</li>
                    <li>Wpisz w przeglądarce <code>chrome://extensions</code> i włącz przełącznik <strong>Tryb dewelopera</strong> (prawy górny róg).</li>
                    <li>Kliknij przycisk <strong>Załaduj rozpakowane</strong> i wskaż rozpakowany folder. Gotowe — ikona E-PROFILER pojawi się na pasku zadań!</li>
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Format wystąpienia
            </label>
            <select
              value={recordingType}
              onChange={(e) => setRecordingType(e.target.value as RecordingType)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
            >
              <option value="wywiad" className="bg-slate-900 text-white">Wywiad (1 na 1)</option>
              <option value="debata" className="bg-slate-900 text-white">Debata / Panel dyskusyjny</option>
              <option value="przemowienie" className="bg-slate-900 text-white">Przemówienie / Oświadczenie</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Data publikacji / emisji
            </label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tytuł opcjonalny (jeśli puste, pobrany automatycznie)
          </label>
          <input
            type="text"
            placeholder="np. Debata prezydencka — Starcie kandydatów"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
          />
        </div>

        {/* Wskazanie badanego polityka (Kluczowe przy wielu mówcach) */}
        <div className="p-4 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900/40 border border-cyan-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Cel profilowania (Kogo badamy?)</span>
            </label>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 px-2 py-0.5 border border-cyan-500/40 rounded">
              ROZPOZNAWANIE MÓWCÓW
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Gdy w nagraniu rozmawia kilku polityków lub dziennikarz zadaje pytania, wskaż nazwisko osoby, którą system ma zidentyfikować i prześwietlić (jej emocje, mimikę, mowę ciała i reakcje na stres).
          </p>

          <div>
            <input
              type="text"
              placeholder="np. Donald Tusk, Sławomir Mentzen, Mateusz Morawiecki... (lub puste: automatyczne wykrycie)"
              value={targetPolitician}
              onChange={(e) => setTargetPolitician(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-cyan-500/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 font-medium transition-all"
            />
          </div>

          {/* Szybkie presety */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
            <span className="text-slate-500 font-mono">Szybki wybór:</span>
            {["Donald Tusk", "Mateusz Morawiecki", "Sławomir Mentzen", "Rafał Trzaskowski", "Krzysztof Bosak"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTargetPolitician(name)}
                className={`px-2 py-0.5 border rounded transition-colors ${
                  targetPolitician === name
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                    : "bg-studio-surface border-studio-border hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300"
                }`}
              >
                {name}
              </button>
            ))}
            {targetPolitician && (
              <button
                type="button"
                onClick={() => setTargetPolitician("")}
                className="px-2 py-0.5 text-slate-400 hover:text-red-400 underline transition-colors"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Strategia sztabowa: Sojusznik vs Przeciwnik */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${politicianRelation === "przeciwnik" ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`} />
              <span>Relacja ze sztabem / Cel raportu *</span>
            </label>
            <span className={`text-[10px] font-mono ${politicianRelation === "przeciwnik" ? "text-rose-400" : "text-emerald-400"}`}>
              {politicianRelation === "przeciwnik" ? "TRYB OFENSYWNY (OPPOSITION RESEARCH)" : "TRYB AUDYTU (WSPARCIE SZTABOWE)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opcja 1: Sojusznik */}
            <div
              onClick={() => setPoliticianRelation("sojusznik")}
              className={`p-3.5 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                politicianRelation === "sojusznik"
                  ? "border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className={`w-4 h-4 ${politicianRelation === "sojusznik" ? "text-emerald-400" : "text-slate-500"}`} />
                <span className={`text-xs font-bold ${politicianRelation === "sojusznik" ? "text-emerald-300" : "text-slate-300"}`}>
                  Sojusznik (Nasz kandydat)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Raport zawiera <strong className="text-slate-200">wskazania i dyrektywy sztabowe</strong>, wygaszanie błędów, wzmacnianie atutów oraz gotowe riposty do trudnych pytań.
              </p>
            </div>

            {/* Opcja 2: Przeciwnik */}
            <div
              onClick={() => setPoliticianRelation("przeciwnik")}
              className={`p-3.5 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                politicianRelation === "przeciwnik"
                  ? "border-rose-500/80 bg-rose-950/35 ring-1 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Target className={`w-4 h-4 ${politicianRelation === "przeciwnik" ? "text-rose-400" : "text-slate-500"}`} />
                <span className={`text-xs font-bold ${politicianRelation === "przeciwnik" ? "text-rose-300" : "text-slate-300"}`}>
                  Przeciwnik / Oponent
                </span>
                <span className="text-[9px] font-mono bg-rose-950/80 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded ml-auto">
                  RYWAL / MEDIA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Raport dla sztabu: <strong className="text-rose-200">słabości psychiczne</strong>, instrukcja <strong className="text-rose-200">jak wyprowadzić go z równowagi</strong>, pytania-pułapki i amunicja do spotów (polityk / dziennikarz / działacz).
              </p>
            </div>
          </div>
        </div>

        {/* Wybór zakresu profilowania */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Zakres oceny E-PROFILERA *
            </label>
            <span className="text-[10px] text-cyan-400 font-mono">Wybierz tryb analizy</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opcja 1: Oceń wszystko */}
            <div
              onClick={() => setAnalysisScope("pelny")}
              className={`p-4 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                analysisScope === "pelny"
                  ? "border-cyan-500/80 bg-cyan-950/30 ring-1 ring-cyan-500/50 shadow-glow-cyan"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="scope"
                  checked={analysisScope === "pelny"}
                  onChange={() => setAnalysisScope("pelny")}
                  className="text-cyan-400 focus:ring-cyan-400"
                />
                <span className={`text-xs font-bold ${analysisScope === "pelny" ? "text-cyan-300" : "text-slate-300"}`}>
                  Oceń wszystko (Zalecane)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                Bada <strong className="text-slate-200">zachowanie, emocje i lęki</strong> oraz <strong className="text-slate-200">skuteczność argumentacji</strong>, czy odbiorcy „kupią” przekaz i jak mówca radzi sobie w starciu z adwersarzami.
              </p>
            </div>

            {/* Opcja 2: Tylko zachowanie i stan psychiczny */}
            <div
              onClick={() => setAnalysisScope("behawioralny")}
              className={`p-4 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                analysisScope === "behawioralny"
                  ? "border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-glow-emerald"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="scope"
                  checked={analysisScope === "behawioralny"}
                  onChange={() => setAnalysisScope("behawioralny")}
                  className="text-emerald-400 focus:ring-emerald-400"
                />
                <span className={`text-xs font-bold ${analysisScope === "behawioralny" ? "text-emerald-300" : "text-slate-300"}`}>
                  Tylko zachowanie i psychika
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                Czyste profilowanie psychologiczne i biometryczne: <strong className="text-slate-200">emocje, lęki, mimika, drżenie głosu i mowa ciała</strong> — bez oceniania polityki i argumentów.
              </p>
            </div>
          </div>
        </div>

        {/* Przełącznik biometrii */}
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/30 via-studio-surface/60 to-studio-surface/40 border border-cyan-500/30 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableBiometrics}
              onChange={(e) => setEnableBiometrics(e.target.checked)}
              className="mt-1 rounded border-cyan-500/50 text-cyan-500 focus:ring-cyan-400 bg-studio-surface"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Włącz zaawansowaną biometrię wideo (mimika FACS, wzrok, drżenie głosu)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Uruchamia klatkową analizę mikroruchów twarzy, częstotliwości mrugania i wariancji częstotliwości tonu podstawowego F0.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || (tab === "screen" && !capturedBlob)}
          className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 mt-5 active:scale-[0.99] ${
            politicianRelation === "przeciwnik"
              ? "bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.35)]"
              : "bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-glow-cyan"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className={`w-4 h-4 animate-spin ${politicianRelation === "przeciwnik" ? "text-white" : "text-slate-950"}`} />
              Inicjalizacja E-PROFILERA...
            </>
          ) : (
            <>
              {politicianRelation === "przeciwnik" ? (
                <>
                  <Target className="w-4 h-4" />
                  <span>Rozpocznij analizę przeciwnika (Wektory ataku)</span>
                </>
              ) : (
                <>
                  <span>Rozpocznij audyt sztabowy materiału</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-studio-border/70">
        <LegalNotice />
      </div>
    </div>
  );
};
