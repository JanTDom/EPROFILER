"use client";

import React, { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteRecording } from "@/lib/api";
import { useRouter } from "next/navigation";

interface DeleteRecordingButtonProps {
  recordingId: string;
  recordingTitle?: string;
  redirectOnDelete?: boolean;
}

export const DeleteRecordingButton: React.FC<DeleteRecordingButtonProps> = ({
  recordingId,
  recordingTitle,
  redirectOnDelete = false,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setLoading(true);
    try {
      await deleteRecording(recordingId);
      if (redirectOnDelete) {
        router.push("/");
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Błąd usuwania nagrania:", err);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-red-950/90 border border-red-500/60 px-2 py-1 rounded text-[11px] font-mono shadow-[0_0_10px_rgba(239,68,68,0.2)]">
        <span className="text-red-300 font-medium">Usunąć?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-400 hover:text-red-200 font-bold px-1 py-0.5 rounded hover:bg-red-800/50 transition-colors"
          title="Potwierdź usunięcie"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Tak"}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded hover:bg-slate-800 transition-colors"
          title="Anuluj"
        >
          Nie
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
      title="Usuń materiał z repozytorium"
      aria-label="Usuń nagranie"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
};
