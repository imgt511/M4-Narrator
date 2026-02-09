const vSelect = document.getElementById('voiceSelect');
const sSlider = document.getElementById('speedSlider');
const sVal = document.getElementById('speedVal');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn');

chrome.storage.local.get(['preferredVoice', 'preferredSpeed'], (r) => { 
  if (r.preferredVoice) vSelect.value = r.preferredVoice; 
  if (r.preferredSpeed) { sSlider.value = r.preferredSpeed; sVal.innerText = r.preferredSpeed; }
});

vSelect.onchange = () => chrome.storage.local.set({ preferredVoice: vSelect.value });
sSlider.oninput = () => {
  sVal.innerText = sSlider.value;
  chrome.storage.local.set({ preferredSpeed: parseFloat(sSlider.value) });
};

const sendMsg = (action) => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action });
  });
};

stopBtn.onclick = () => {
  sendMsg("stop_reading");
  stopBtn.innerText = "STOPPED";
  setTimeout(() => stopBtn.innerText = "STOP", 1000);
};

pauseBtn.onclick = () => {
  sendMsg("toggle_pause");
  pauseBtn.innerText = (pauseBtn.innerText === "PAUSE") ? "RESUME" : "PAUSE";
};