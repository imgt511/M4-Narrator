chrome.runtime.onInstalled.addListener(() => {
  createMenus();
});

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "pocket-reader", title: "Pocket Reader", contexts: ["all"] });
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "read-inplace", title: "Read In-Place", contexts: ["selection"] });
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "paste-to-reader", title: "Paste to Reader", contexts: ["selection"] });
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "open-from-clipboard", title: "Open Reader (Clipboard)", contexts: ["all"] });
    
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "sep1", type: "separator", contexts: ["all"] });
    
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "remote-pause", title: "Pause / Resume", contexts: ["all"] });
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "remote-stop", title: "Stop Reading", contexts: ["all"] });
    chrome.contextMenus.create({ parentId: "pocket-reader", id: "remote-close", title: "Close Reader Tab", contexts: ["all"] });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "read-inplace") {
    chrome.tabs.sendMessage(tab.id, { action: "start_reading_in_place" });
  } 
  else if (info.menuItemId === "paste-to-reader") {
    chrome.storage.local.set({ tempText: info.selectionText }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("reader.html") });
    });
  } 
  else if (info.menuItemId === "open-from-clipboard") {
    chrome.storage.local.set({ tempText: "CLIPBOARD_MODE" }, () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("reader.html") });
    });
  }
  else if (info.menuItemId === "remote-pause") {
    chrome.tabs.sendMessage(tab.id, { action: "toggle_pause" });
  }
  else if (info.menuItemId === "remote-stop") {
    chrome.tabs.sendMessage(tab.id, { action: "stop_reading" });
  }
  else if (info.menuItemId === "remote-close") {
    if (tab.url.includes("reader.html")) { chrome.tabs.remove(tab.id); }
  }
});

// Passport fetch logic
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetch_audio") {
    fetch(`http://localhost:8000/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: msg.text, voice: msg.voice, speed: msg.speed })
    })
    .then(r => r.arrayBuffer())
    .then(buf => {
      let binary = '';
      let bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      sendResponse({ audioData: "data:audio/wav;base64," + btoa(binary) });
    }).catch(e => sendResponse({ error: true }));
    return true; 
  }
});