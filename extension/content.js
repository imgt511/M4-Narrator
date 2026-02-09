let audio = new Audio();
let queue = [];
let currentVoice, currentSpeed;
let stopTimestamp = 0;
let isPaused = false;

// 1. STYLE: Set Mauve selection for the browser
const style = document.createElement('style');
style.innerHTML = `::selection { background: #d8b4e2 !important; color: #000 !important; }`;
document.head.appendChild(style);

// 2. STARTUP: Detect if we are in the Sanctuary (reader.html)
if (window.location.href.includes("reader.html")) {
    handleReaderStartup();
}

async function handleReaderStartup() {
    const settings = await chrome.storage.local.get(['tempText', 'preferredVoice', 'preferredSpeed']);
    let textToRead = settings.tempText;

    // Handle Clipboard Mode
    if (textToRead === "CLIPBOARD_MODE") {
        try { 
            textToRead = await navigator.clipboard.readText(); 
        } catch (err) {
            textToRead = "Clipboard access denied. Please click the page and try again.";
        }
    }

    if (textToRead) {
        // CLEANER: Remove Markdown symbols (**bold**, ###, etc) for display and voice
        const cleanText = textToRead.replace(/\*\*|\#\#\#|\-\s/g, "");
        const display = document.getElementById('content');
        if (display) display.innerText = cleanText;
        
        startNarration(cleanText, settings.preferredVoice || "af_sarah", settings.preferredSpeed || 1.0);
    }
}

// 3. LISTENERS: Listen for the "Remote Control" menu commands
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "start_reading_in_place") {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            // Find the container (article or bubble) to avoid reading the whole page
            const container = selection.anchorNode.parentElement.closest('article, [role="main"], .message-content, .markdown, .mw-parser-output') || document.body;
            const range = document.createRange();
            range.setStart(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset);
            range.setEndAfter(container);
            
            chrome.storage.local.get(['preferredVoice', 'preferredSpeed'], (res) => {
                startNarration(range.toString(), res.preferredVoice || "af_sarah", res.preferredSpeed || 1.0);
            });
        }
    }
    
    if (msg.action === "stop_reading") { 
        stopTimestamp = Date.now(); 
        audio.pause(); 
        queue = []; 
        window.getSelection().removeAllRanges();
    }
    
    if (msg.action === "toggle_pause") {
        if (isPaused) { 
            audio.play(); 
            isPaused = false; 
        } else { 
            audio.pause(); 
            isPaused = true; 
        }
    }
});

// 4. ENGINE: Split text and manage the audio flow
function startNarration(text, voice, speed) {
    stopTimestamp = Date.now();
    isPaused = false;
    currentVoice = voice;
    currentSpeed = speed;
    queue = splitSentences(text);
    playNext(stopTimestamp);
}

// ELEGANT SPLITTER: Handles decimals (5.5) and abbreviations (Dr.)
function splitSentences(text) {
    const abbreviations = new Set(["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e", "u.s", "u.k"]);
    const sentences = [];
    let start = 0;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== "." && ch !== "!" && ch !== "?") continue;

        const prev = text[i - 1] || "";
        const next = text[i + 1] || "";

        // Skip decimals
        if (ch === "." && /\d/.test(prev) && /\d/.test(next)) continue; 

        // Skip abbreviations
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
    return sentences.map(s => s.trim()).filter(s => s.length > 1);
}

async function playNext(timestamp) {
    if (queue.length === 0 || timestamp < stopTimestamp || isPaused) return;

    let sentence = queue.shift();
    
    // THE CHASE: Move the highlight and scroll
    try {
        window.find(sentence, false, false, true, false, true, false);
    } catch (e) {}

    chrome.runtime.sendMessage({ 
        action: "fetch_audio", 
        text: sentence, 
        voice: currentVoice, 
        speed: currentSpeed 
    }, (res) => {
        // Stop Guard
        if (timestamp < stopTimestamp) return;

        if (res && res.audioData) {
            audio.src = res.audioData;
            audio.play().catch(e => console.log("Playback interrupted"));
            audio.onended = () => playNext(timestamp);
        } else {
            playNext(timestamp);
        }
    });
}