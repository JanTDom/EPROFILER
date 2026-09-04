// E-PROFILER — Popup Controller

document.addEventListener("DOMContentLoaded", async () => {
  const activeTabTitle = document.getElementById("active-tab-title");
  const targetPersonInput = document.getElementById("target-person");
  const formatSelect = document.getElementById("recording-format");
  const btnStart = document.getElementById("btn-start");
  const btnStop = document.getElementById("btn-stop");
  const recStatus = document.getElementById("rec-status");
  const recTimer = document.getElementById("rec-timer");
  const statusMsg = document.getElementById("status-msg");

  let currentTab = null;
  let timerInterval = null;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];
    if (currentTab) {
      activeTabTitle.textContent = currentTab.title || currentTab.url || "Aktywna karta";
    }
  } catch (e) {
    activeTabTitle.textContent = "Brak dostępu do karty";
  }

  // Sprawdź stan nagrywania w karcie
  if (currentTab && currentTab.id) {
    chrome.tabs.sendMessage(currentTab.id, { action: "GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.isRecording) {
        setRecordingUI(true, response.secondsElapsed);
      }
    });
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function setRecordingUI(recording, sec = 0) {
    if (recording) {
      btnStart.style.display = "none";
      btnStop.style.display = "flex";
      recStatus.style.display = "block";
      recTimer.textContent = formatTime(sec);
      let elapsed = sec;
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        elapsed++;
        recTimer.textContent = formatTime(elapsed);
      }, 1000);
    } else {
      btnStart.style.display = "flex";
      btnStop.style.display = "none";
      recStatus.style.display = "none";
      if (timerInterval) clearInterval(timerInterval);
    }
  }

  btnStart.addEventListener("click", async () => {
    if (!currentTab || !currentTab.id) return;
    const targetPerson = targetPersonInput.value.trim();
    const format = formatSelect.value;

    chrome.tabs.sendMessage(
      currentTab.id,
      {
        action: "START_RECORDING_WITH_PARAMS",
        targetPerson,
        format,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          alert("Przeładuj tę stronę wideo (F5) przed pierwszym nagraniem z rozszerzenia.");
          return;
        }
        window.close(); // zamyka popup, by nie przeszkadzać w wyborze karty w oknie getDisplayMedia
      }
    );
  });

  btnStop.addEventListener("click", async () => {
    if (!currentTab || !currentTab.id) return;
    statusMsg.style.display = "block";
    chrome.tabs.sendMessage(currentTab.id, { action: "STOP_RECORDING" }, () => {
      setRecordingUI(false);
      window.close();
    });
  });
});
