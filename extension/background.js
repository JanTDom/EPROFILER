// E-PROFILER — Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Opcjonalnie otwórz stronę główną E-PROFILER po instalacji
    chrome.tabs.create({ url: "https://eprofiler.pl" });
  }

  // Utwórz menu kontekstowe
  chrome.contextMenus.create({
    id: "eprofiler-inspect-video",
    title: "⚡ Profiluj to wideo w E-PROFILERZE",
    contexts: ["page", "video"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "eprofiler-inspect-video" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "OPEN_HUD_PANEL" });
  }
});

// Nasłuchiwanie komunikatów
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PING") {
    sendResponse({ status: "PONG" });
  }
  return true;
});
