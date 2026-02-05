let audio = new Audio();
let queue = [];
let currentVoice, currentSpeed;
let stopTimestamp = 0;

// Force Mauve Highlighting
const style = document.createElement('style');
style.innerHTML = `::selection { background: #d8b4e2 !important; color: #000 !important; }`;
document.head.appendChild(style);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "start_reading") {
    stopTimestamp = Date.now();
    currentVoice = msg.voice;
    currentSpeed = msg.speed;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      // 1. SMART BOUNDARY
      const container = selection.anchorNode.parentElement.closest('article, [role="main"], .message-content, .markdown, .mw-parser-output') || document.body;
      const range = document.createRange();
      range.setStart(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset);
      range.setEndAfter(container);
      
      const rawText = range.toString();

      // 2. THE SENTENCE BRAIN (Preserved your scanner)
      queue = splitSentences(rawText);
      playNext(stopTimestamp);
    }
  }
  
  if (msg.action === "stop_reading") {
    stopTimestamp = Date.now();
    audio.pause();
    window.getSelection().removeAllRanges();
  }
});

// PRESERVED: Your advanced decimal and abbreviation scanner
function splitSentences(text) {
  const sentences = [];
  const abbreviations = new Set(["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e"]);
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    const prev = text[i - 1] || "";
    const next = text[i + 1] || "";
    if (ch === "." && /\d/.test(prev) && /\d/.test(next)) continue; 
    if (ch === ".") {
      const wordMatch = text.slice(Math.max(0, i - 10), i + 1).match(/([A-Za-z]{1,5})\.$/);
      if (wordMatch && abbreviations.has(wordMatch[1].toLowerCase())) continue;
    }
    if (next === "" || /\s|["')\]]/.test(next)) {
      sentences.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }
  if (start < text.length) sentences.push(text.slice(start));
  return sentences;
}

async function playNext(timestamp) {
  if (queue.length === 0 || timestamp < stopTimestamp) return;

  let originalSentence = queue.shift().trim();
  if (originalSentence.length < 2) return playNext(timestamp);

  // 3. THE DUAL-TRACK FIX: 
  // 'cleanSentence' is for the Ears (M4). 'findTarget' is for the Eyes (Highlight).
  let cleanSentence = originalSentence.replace(/\[\d+\]/g, ""); // Remove [1] for the voice
  let findTarget = originalSentence.substring(0, 40); // Use first 40 chars for reliable find

  // THE CHASE: Attempt to highlight and scroll
  try {
    window.find(findTarget, false, false, true, false, true, false);
  } catch (e) {
    console.log("Visual chase failed, but audio will continue.");
  }

  chrome.runtime.sendMessage({ 
    action: "fetch_audio", 
    text: cleanSentence, 
    voice: currentVoice, 
    speed: currentSpeed 
  }, (res) => {
    if (timestamp < stopTimestamp) return;
    if (res && res.audioData) {
      audio.src = res.audioData;
      audio.play();
      audio.onended = () => playNext(timestamp);
    } else {
      playNext(timestamp); // Skip and continue if audio fails
    }
  });
}