const vSelect = document.getElementById('voiceSelect');
const sSlider = document.getElementById('speedSlider');
const sVal = document.getElementById('speedVal');
const stopBtn = document.getElementById('stopBtn');

chrome.storage.local.get(['preferredVoice', 'preferredSpeed'], (r) => { 
  if (r.preferredVoice) vSelect.value = r.preferredVoice; 
  if (r.preferredSpeed) {
    sSlider.value = r.preferredSpeed;
    sVal.innerText = r.preferredSpeed;
  }
});

vSelect.onchange = () => chrome.storage.local.set({ preferredVoice: vSelect.value });
sSlider.oninput = () => {
  sVal.innerText = sSlider.value;
  chrome.storage.local.set({ preferredSpeed: parseFloat(sSlider.value) });
};

stopBtn.onclick = () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "stop_reading" });
  });
  
  // UI FEEDBACK
  const originalText = stopBtn.innerText;
  stopBtn.innerText = "STOPPED";
  stopBtn.style.background = "#95a5a6"; // Change to gray
  
  setTimeout(() => {
    stopBtn.innerText = originalText;
    stopBtn.style.background = "#e74c3c"; // Change back to red
  }, 1500);
};