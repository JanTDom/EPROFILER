"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";
import { subscribeToProgress } from "@/lib/api";
import { ProgressEventPayload, ProcessingStatus } from "@/lib/types";

interface StepConfig {
  id: string;
  label: string;
  statuses: ProcessingStatus[];
}

const STEPS: StepConfig[] = [
  {
    id: "ingest",
    label: "Pobranie i zapis materiału źródłowego",
    statuses: ["POBIERANIE", "POBRANO", "TRANSKODOWANIE", "EKSTRAKCJA_AUDIO", "GOTOWE_DO_TRANSKRYPCJI", "TRANSKRYPCJA", "DIARYZACJA", "RETORYKA", "PROZODIA", "ZAKONCZONE"],
  },
  {
    id: "transcode",
    label: "Transkodowanie do lekkiego proxy 720p (faststart)",
    statuses: ["TRANSKODOWANIE", "EKSTRAKCJA_AUDIO", "GOTOWE_DO_TRANSKRYPCJI", "TRANSKRYPCJA", "DIARYZACJA", "RETORYKA", "PROZODIA", "ZAKONCZONE"],
  },
  {
    id: "audio",
    label: "Ekstrakcja znormalizowanego audio (16 kHz WAV)",
    statuses: ["EKSTRAKCJA_AUDIO", "GOTOWE_DO_TRANSKRYPCJI", "TRANSKRYPCJA", "DIARYZACJA", "RETORYKA", "PROZODIA", "ZAKONCZONE"],
  },
  {
    id: "ready",
    label: "Gotowość do transkrypcji i diaryzacji (Faza 2)",
    statuses: ["GOTOWE_DO_TRANSKRYPCJI", "TRANSKRYPCJA", "DIARYZACJA", "RETORYKA", "PROZODIA", "ZAKONCZONE"],
  },
];

export const ProgressStepper: React.FC<{
  recordingId: string;
  initialStatus: ProcessingStatus;
  initialStep: string;
  initialPercent: number;
  onComplete?: () => void;
  onRetry?: () => void;
}> = ({ recordingId, initialStatus, initialStep, initialPercent, onComplete, onRetry }) => {
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus);
  const [currentStepText, setCurrentStepText] = useState(initialStep);
  const [percent, setPercent] = useState(initialPercent);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
    setCurrentStepText(initialStep);
    setPercent(initialPercent);
  }, [initialStatus, initialStep, initialPercent]);

  useEffect(() => {
    if (status === "GOTOWE_DO_TRANSKRYPCJI" || status === "ZAKONCZONE") {
      return;
    }

    const unsubscribe = subscribeToProgress(
      recordingId,
      (data: ProgressEventPayload) => {
        setStatus(data.status);
        setCurrentStepText(data.krok);
        setPercent(data.procent);
        if (data.blad) setErrorMsg(data.blad);
      },
      (finalData: ProgressEventPayload) => {
        setStatus(finalData.status);
        setCurrentStepText(finalData.krok);
        setPercent(finalData.procent);
        if (finalData.blad) setErrorMsg(finalData.blad);
        if (onComplete) onComplete();
      },
      (err) => {
        console.error("Błąd połączenia SSE", err);
      }
    );

    return () => unsubscribe();
  }, [recordingId, status, onComplete]);

  const isStepComplete = (step: StepConfig, currentStatus: ProcessingStatus) => {
    const statusOrder: ProcessingStatus[] = [
      "OCZEKUJE",
      "POBIERANIE",
      "POBRANO",
      "TRANSKODOWANIE",
      "EKSTRAKCJA_AUDIO",
      "GOTOWE_DO_TRANSKRYPCJI",
      "ZAKONCZONE",
    ];
    const stepTargetStatus = step.statuses[0];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(stepTargetStatus);
    return currentIndex > targetIndex || currentStatus === "GOTOWE_DO_TRANSKRYPCJI" || currentStatus === "ZAKONCZONE";
  };

  const isStepActive = (step: StepConfig, currentStatus: ProcessingStatus) => {
    return step.statuses.includes(currentStatus) && !isStepComplete(step, currentStatus);
  };

  const handleTriggerRetry = async () => {
    if (onRetry) {
      setRetrying(true);
      setErrorMsg(null);
      try {
        await onRetry();
      } finally {
        setRetrying(false);
      }
    }
  };

  return (
    <div className="bg-studio-card/90 border border-studio-border/80 p-5 rounded-2xl shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            Pipeline przetwarzania A/V (Faza 1)
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{currentStepText}</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-base font-black text-cyan-400">{percent}%</span>
        </div>
      </div>

      {/* Pasek postępu */}
      <div className="w-full bg-studio-surface h-2 mb-5 rounded-full overflow-hidden border border-studio-border/60">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            status === "BLAD"
              ? "bg-red-500 shadow-glow-red"
              : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-glow-cyan"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-950/50 border border-red-500/50 rounded-xl text-red-200 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>

          {onRetry && (
            <button
              type="button"
              onClick={handleTriggerRetry}
              disabled={retrying}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Wznawianie...
                </>
              ) : (
                "Wznów przetwarzanie materiału"
              )}
            </button>
          )}
        </div>
      )}

      {/* Lista kroków */}
      <div className="space-y-2.5">
        {STEPS.map((step, idx) => {
          const completed = isStepComplete(step, status);
          const active = isStepActive(step, status);

          return (
            <div key={step.id} className="flex items-center gap-2.5 text-xs">
              {completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
              )}
              <span
                className={`${
                  completed
                    ? "text-slate-200 font-medium"
                    : active
                    ? "text-cyan-300 font-bold"
                    : "text-slate-500"
                }`}
              >
                {idx + 1}. {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
