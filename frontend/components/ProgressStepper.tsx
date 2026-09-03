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
}> = ({ recordingId, initialStatus, initialStep, initialPercent, onComplete }) => {
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus);
  const [currentStepText, setCurrentStepText] = useState(initialStep);
  const [percent, setPercent] = useState(initialPercent);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "GOTOWE_DO_TRANSKRYPCJI" || status === "ZAKONCZONE" || status === "BLAD") {
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

  return (
    <div className="bg-white border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-900">
            Pipeline przetwarzania A/V (Faza 1)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{currentStepText}</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-lg font-bold text-slate-900">{percent}%</span>
        </div>
      </div>

      {/* Pasek postępu */}
      <div className="w-full bg-slate-100 h-2 mb-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            status === "BLAD" ? "bg-danger" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Lista kroków */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const completed = isStepComplete(step, status);
          const active = isStepActive(step, status);

          return (
            <div key={step.id} className="flex items-center gap-3 text-xs">
              {completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
              <span
                className={`${
                  completed
                    ? "text-slate-900 font-medium"
                    : active
                    ? "text-slate-900 font-semibold"
                    : "text-slate-400"
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
