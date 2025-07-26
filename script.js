const userTextEl = document.getElementById("userText");
const botResponseEl = document.getElementById("botResponse");
const statusEl = document.getElementById("status");
const listenBtn = document.getElementById("listenBtn");
const voiceSelect = document.getElementById("voiceSelect");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

// Debug elements
const debugInfo = {
  ttsSupport: document.getElementById("ttsSupport"),
  voiceCount: document.getElementById("voiceCount"),
  flaskStatus: document.getElementById("flaskStatus"),
  ollamaStatus: document.getElementById("ollamaStatus"),
  currentStatus: document.getElementById("currentStatus"),
  lastError: document.getElementById("lastError")
};

let currentUtterance = null;
let isListening = false;
let isSpeaking = false;

// Try multiple Flask URLs in case of issues
const FLASK_URLS = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://0.0.0.0:5000'
];

let workingFlaskUrl = null;

// Find working Flask URL
async function findWorkingFlaskUrl() {
  for (const url of FLASK_URLS) {
    try {
      console.log(`Testing Flask URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        workingFlaskUrl = url;
        console.log(`✅ Found working Flask URL: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`❌ Flask URL ${url} failed:`, error.message);
    }
  }
  return null;
}

// Check Flask and Ollama status
async function checkHealth() {
  try {
    updateDebugError('Checking Flask connection...');
    
    const flaskUrl = workingFlaskUrl || await findWorkingFlaskUrl();
    
    if (!flaskUrl) {
      debugInfo.flaskStatus.textContent = '❌ Not reachable';
      debugInfo.ollamaStatus.textContent = '❓ Unknown';
      updateDebugError('❌ Cannot reach Flask server. Make sure Flask is running with: python app.py');
      return;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${flaskUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      debugInfo.flaskStatus.textContent = data.flask || '✅ Running';
      debugInfo.ollamaStatus.textContent = data.ollama || '❓ Unknown';
      updateDebugError(`✅ Health check completed. Using: ${flaskUrl}`);
      console.log('Health check successful:', data);
    } else {
      debugInfo.flaskStatus.textContent = `❌ HTTP ${response.status}`;
      debugInfo.ollamaStatus.textContent = '❓ Unknown';
      updateDebugError(`❌ Flask returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      updateDebugError('❌ Request timed out. Flask server might be slow or not running.');
    } else {
      updateDebugError(`❌ Network error: ${error.message}. Check if Flask is running.`);
    }
    debugInfo.flaskStatus.textContent = '❌ Connection failed';
    debugInfo.ollamaStatus.textContent = '❓ Unknown';
    console.error('Health check failed:', error);
  }
}

// Initialize TTS support check
function initializeTTS() {
  const supported = 'speechSynthesis' in window;
  debugInfo.ttsSupport.textContent = supported ? "✅ Yes" : "❌ No";
  
  if (supported) {
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }
  
  // Check Flask/Ollama status on startup
  checkHealth();
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  debugInfo.voiceCount.textContent = voices.length;
  
  voiceSelect.innerHTML = '<option value="">Default Voice</option>';
  voices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.default) option.textContent += ' - Default';
    voiceSelect.appendChild(option);
  });
}

function updateStatus(message, className = '') {
  statusEl.textContent = message;
  statusEl.className = `status ${className}`;
  debugInfo.currentStatus.textContent = message;
}

function updateDebugError(error) {
  debugInfo.lastError.textContent = error;
  console.log('Status:', error);
}

speedRange.addEventListener('input', (e) => {
  speedValue.textContent = e.target.value;
});

function startListening() {
  if (isListening) return;
  
  stopSpeaking();
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    updateDebugError('❌ Speech recognition not supported in this browser');
    return;
  }
  
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  
  isListening = true;
  listenBtn.disabled = true;
  listenBtn.classList.add('listening');
  updateStatus('🎤 Listening... Speak now!', 'listening');
  
  recognition.start();
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const confidence = event.results[0][0].confidence;
    
    userTextEl.textContent = `"${transcript}"`;
    updateDebugError(`✅ Speech recognized with ${(confidence * 100).toFixed(1)}% confidence`);
    
    sendToFlask(transcript);
  };
  
  recognition.onerror = function(err) {
    updateDebugError(`❌ Speech recognition error: ${err.error}`);
    resetListening();
  };
  
  recognition.onend = function() {
    resetListening();
  };
  
  setTimeout(() => {
    if (isListening && recognition) {
      recognition.stop();
    }
  }, 10000);
}

function resetListening() {
  isListening = false;
  listenBtn.disabled = false;
  listenBtn.classList.remove('listening');
  if (!isSpeaking) {
    updateStatus('Ready to listen...');
  }
}

async function sendToFlask(prompt) {
  updateStatus('🔄 Processing your request...', 'processing');
  
  try {
    const flaskUrl = workingFlaskUrl || await findWorkingFlaskUrl();
    
    if (!flaskUrl) {
      throw new Error('Flask server not reachable. Make sure it\'s running with: python app.py');
    }
    
    updateDebugError(`📡 Sending request to ${flaskUrl}/ask...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${flaskUrl}/ask`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ prompt: prompt }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Flask server returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const responseText = data.response || 'No response received from AI';
    
    botResponseEl.textContent = `"${responseText}"`;
    speakText(responseText);
    updateDebugError('✅ Request completed successfully');
    
  } catch (error) {
    let errorMsg;
    
    if (error.name === 'AbortError') {
      errorMsg = 'Request timed out. The AI might be processing a complex request.';
    } else if (error.message.includes('fetch')) {
      errorMsg = 'Network error. Check if Flask server is running.';
    } else {
      errorMsg = error.message;
    }
    
    botResponseEl.textContent = `Error: ${errorMsg}`;
    updateDebugError(`❌ ${errorMsg}`);
    updateStatus('❌ Error occurred');
    resetListening();
  }
}

function speakText(text) {
  if (!text || !('speechSynthesis' in window)) {
    updateDebugError('❌ Speech synthesis not supported or no text provided');
    return;
  }
  
  stopSpeaking();
  updateStatus('🔊 Speaking...', 'speaking');
  isSpeaking = true;
  
  try {
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    const voices = speechSynthesis.getVoices();
    const selectedVoiceIndex = voiceSelect.value;
    if (selectedVoiceIndex && voices[selectedVoiceIndex]) {
      currentUtterance.voice = voices[selectedVoiceIndex];
    }
    
    currentUtterance.rate = parseFloat(speedRange.value);
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;
    currentUtterance.lang = 'en-US';
    
    currentUtterance.onstart = function() {
      updateStatus('🔊 Speaking...', 'speaking');
    };
    
    currentUtterance.onend = function() {
      isSpeaking = false;
      currentUtterance = null;
      updateStatus('Ready to listen...');
    };
    
    currentUtterance.onerror = function(event) {
      updateDebugError(`❌ Speech error: ${event.error}`);
      isSpeaking = false;
      currentUtterance = null;
      updateStatus('❌ Speech error occurred');
    };
    
    speechSynthesis.speak(currentUtterance);
    updateDebugError('✅ Speech synthesis started');
    
  } catch (error) {
    updateDebugError(`❌ Failed to start speech: ${error.message}`);
    isSpeaking = false;
    currentUtterance = null;
  }
}

function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  if (currentUtterance) {
    currentUtterance = null;
  }
  isSpeaking = false;
}

function testTTS() {
  const testText = "Hello! This is a test of the text-to-speech functionality. If you can hear this, everything is working correctly.";
  speakText(testText);
}

// Initialize when page loads
window.addEventListener('load', initializeTTS);

// Handle page visibility
document.addEventListener('visibilitychange', function() {
  if (document.hidden && speechSynthesis.speaking) {
    console.log('Page hidden, speech may pause');
  }
});