// E-PROFILER — In-Page VOD Assistant & Capture Script
(function () {
  if (window.__EPROFILER_INITIALIZED__) return;
  window.__EPROFILER_INITIALIZED__ = true;

  const API_ENDPOINT = "https://eprofiler.pl/api/analyze";
  let mediaRecorder = null;
  let recordedChunks = [];
  let captureStream = null;
  let timerInterval = null;
  let secondsElapsed = 0;
  let isRecording = false;
  let hasAudioTrack = true;

  // Sprawdź czy strona zawiera odtwarzacz wideo
  function findVideoElement() {
    return document.querySelector("video");
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Utwórz główny kontener HUD
  const root = document.createElement("div");
  root.id = "eprofiler-root";
  document.body.appendChild(root);

  let isPanelOpen = false;

  function render() {
    const video = findVideoElement();
    const isPaused = video ? video.paused : true;

    if (!isPanelOpen) {
      root.innerHTML = `
        <button class="eprofiler-pill-btn" id="eprofiler-open-btn" title="Kliknij, aby otworzyć asystenta profilowania">
          <span class="eprofiler-pulse-dot ${isRecording ? "eprofiler-rec-dot" : ""}"></span>
          <span>${isRecording ? `REC // ${formatTime(secondsElapsed)}` : "E-PROFILER"}</span>
        </button>
      `;

      document.getElementById("eprofiler-open-btn")?.addEventListener("click", () => {
        isPanelOpen = true;
        render();
      });
      return;
    }

    // Panel rozwinięty
    root.innerHTML = `
      <div class="eprofiler-panel">
        <div class="eprofiler-panel-header">
          <div class="eprofiler-brand">
            <span class="eprofiler-pulse-dot ${isRecording ? "eprofiler-rec-dot" : ""}"></span>
            <span>E-PROFILER // ASYSTENT VOD</span>
          </div>
          <button class="eprofiler-close-btn" id="eprofiler-close-btn" title="Zwiń panel">✕</button>
        </div>

        ${
          !isRecording
            ? `
          <div class="eprofiler-status-box ${isPaused ? "eprofiler-status-warn" : ""}">
            ${
              isPaused
                ? "⚠️ <strong>Wideo jest zapauzowane.</strong> Uruchom odtwarzanie materiału przed rozpoczęciem nagrywania. Jeśli serwis wymaga logowania — zaloguj się teraz."
                : "🟢 <strong>Wykryto aktywny odtwarzacz wideo.</strong> Kliknij poniżej, aby przechwycić ten fragment."
            }
          </div>

          <div class="eprofiler-input-group">
            <label class="eprofiler-label">Badany polityk / Cel audytu</label>
            <input type="text" id="eprofiler-target-input" class="eprofiler-input" placeholder="np. Donald Tusk, Mateusz Morawiecki..." value="" />
          </div>

          <button class="eprofiler-btn eprofiler-btn-primary" id="eprofiler-start-btn">
            ⏺️ Rozpocznij nagrywanie wideo
          </button>
          
          <p style="font-size: 10px; color: #f59e0b; margin: 8px 0 0 0; line-height: 1.35;">
            💡 <strong>Dźwięk:</strong> W oknie Chrome zaznacz kartę i włącz przełącznik <strong>„Udostępnij dźwięk z karty”</strong> na dole, aby nagrać głos.
          </p>
        `
            : `
          <div class="eprofiler-status-box ${hasAudioTrack ? "eprofiler-status-rec" : "eprofiler-status-warn"}">
            <span>${hasAudioTrack ? "🔴 REC // 🔊 GŁOS AKTYWNY" : "⚠️ REC // 🔇 BRAK GŁOSU!"}</span>
            <span>${formatTime(secondsElapsed)}</span>
          </div>

          ${
            !hasAudioTrack
              ? `<p style="font-size: 11px; color: #f87171; font-weight: bold; margin: 6px 0; line-height: 1.3;">
                  ⚠️ Uwaga: Karta została wybrana bez dźwięku! Przeglądarka nie rejestruje głosu. Zakończ i zaznacz „Udostępnij dźwięk z karty”.
                 </p>`
              : `<p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.4;">
                  Trwa nagrywanie wystąpienia. Nagraj kluczowy fragment (od 30 sek. do paru minut) i zakończ nagranie.
                 </p>`
          }

          <button class="eprofiler-btn eprofiler-btn-danger" id="eprofiler-stop-btn">
            ⏹️ Zakończ i profiluj w E-PROFILERZE
          </button>
        `
        }

        <div id="eprofiler-loading-msg" style="display: none; font-size: 11px; color: #22d3ee; text-align: center; font-weight: bold; padding: 6px;">
          ⏳ Przesyłanie do silnika AI i generowanie audytu...
        </div>

        <a href="https://eprofiler.pl" target="_blank" class="eprofiler-footer-link">
          Otwórz panel główny eprofiler.pl ↗
        </a>
      </div>
    `;

    document.getElementById("eprofiler-close-btn")?.addEventListener("click", () => {
      isPanelOpen = false;
      render();
    });

    document.getElementById("eprofiler-start-btn")?.addEventListener("click", startRecording);
    document.getElementById("eprofiler-stop-btn")?.addEventListener("click", stopRecording);
  }

  async function startRecording() {
    try {
      recordedChunks = [];
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true,
      });

      captureStream = stream;
      const audioTracks = stream.getAudioTracks();
      hasAudioTrack = audioTracks.length > 0;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";

      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1000000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = uploadAndAnalyze;

      // Jeśli użytkownik sam kliknie "Zatrzymaj udostępnianie" na pasku przeglądarki
      if (stream.getVideoTracks()[0]) {
        stream.getVideoTracks()[0].onended = () => {
          if (isRecording) stopRecording();
        };
      }

      mediaRecorder.start(1000);
      isRecording = true;
      secondsElapsed = 0;
      timerInterval = setInterval(() => {
        secondsElapsed++;
        render();
      }, 1000);

      render();
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        alert("Błąd uruchamiania nagrywania: " + err.message);
      }
    }
  }

  function stopRecording() {
    if (timerInterval) clearInterval(timerInterval);
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (captureStream) {
      captureStream.getTracks().forEach((track) => track.stop());
    }
    isRecording = false;
    render();
  }

  async function uploadAndAnalyze() {
    const loadingMsg = document.getElementById("eprofiler-loading-msg");
    if (loadingMsg) loadingMsg.style.display = "block";

    try {
      const mimeType = mediaRecorder?.mimeType || "video/webm";
      const blob = new Blob(recordedChunks, { type: mimeType });
      const targetInput = document.getElementById("eprofiler-target-input");
      const targetPolitician = targetInput && targetInput.value ? targetInput.value.trim() : "";

      const file = new File([blob], "vod_capture.webm", { type: mimeType });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tytul", `Przechwycenie ze strony: ${document.title.slice(0, 50)}`);
      formData.append("typ_nagrania", "wywiad");
      formData.append("zakres_analizy", "pelny");
      formData.append("profile_id", "profile_main");
      if (targetPolitician) formData.append("polityk_docelowy", targetPolitician);

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || "Błąd analizy materiału przez AI.");
      }

      const result = await response.json();
      if (result?.id) {
        window.open(`https://eprofiler.pl/recordings/${result.id}`, "_blank");
      } else {
        window.open("https://eprofiler.pl", "_blank");
      }
    } catch (err) {
      alert("Błąd podczas przesyłania do E-PROFILER: " + err.message);
    } finally {
      if (loadingMsg) loadingMsg.style.display = "none";
      isPanelOpen = false;
      render();
    }
  }

  // Obsługa komunikatów z popupu i background service workera
  chrome.runtime.onMessage?.addListener((msg, sender, sendResponse) => {
    if (msg.action === "GET_STATUS") {
      sendResponse({ isRecording, secondsElapsed });
    } else if (msg.action === "OPEN_HUD_PANEL") {
      isPanelOpen = true;
      render();
      sendResponse({ status: "OK" });
    } else if (msg.action === "START_RECORDING_WITH_PARAMS") {
      isPanelOpen = true;
      render();
      const targetInput = document.getElementById("eprofiler-target-input");
      if (targetInput && msg.targetPerson) {
        targetInput.value = msg.targetPerson;
      }
      startRecording();
      sendResponse({ status: "STARTED" });
    } else if (msg.action === "STOP_RECORDING") {
      stopRecording();
      sendResponse({ status: "STOPPED" });
    }
    return true;
  });

  // Obserwuj pojawianie się odtwarzacza wideo w DOM
  setInterval(() => {
    if (!isRecording && !document.getElementById("eprofiler-root")) {
      document.body.appendChild(root);
      render();
    }
  }, 2000);

  // Inicjalne wyrenderowanie
  render();
})();
