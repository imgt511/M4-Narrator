chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "read-local", title: "Read from here to bottom", contexts: ["all"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.local.get(['preferredVoice', 'preferredSpeed'], (res) => {
    chrome.tabs.sendMessage(tab.id, {
      action: "start_reading",
      voice: res.preferredVoice || "af_sarah",
      speed: res.preferredSpeed || 1.0
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "fetch_audio") {
    // USING POST - No character limit!
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
    })
    .catch(e => sendResponse({ error: true }));
    return true; 
  }
});