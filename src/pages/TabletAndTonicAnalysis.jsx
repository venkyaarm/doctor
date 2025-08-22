import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
// Import icons from lucide-react (ensure you have installed it: npm install lucide-react)
import {
  Send,
  Camera,
  Upload,
  Loader2,
  XCircle,
  MessageSquare,
  Info,
  AlertTriangle,
  Mic,
  Trash2,
  StopCircle,
  FlipHorizontal, // New: Camera flip icon
} from 'lucide-react';

export default function TabletAndTonicAnalysis() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (back) or 'user' (front)

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_KEY = "AIzaSyDykTtPcnGg-FRH1eXrzidHjH-smrCXehs";
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        if (transcript.trim()) {
          sendToGemini([{ text: transcript }]);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setErrorMessage(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setErrorMessage("Speech Recognition is not supported in this browser.");
      console.warn("SpeechRecognition API not supported.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Exponential backoff for API calls
  const exponentialBackoffFetch = async (url, options, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
          await new Promise(res => setTimeout(res, delay));
          return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (retries > 0) {
        console.warn(`Fetch failed. Retrying in ${delay / 1000}s...`, error);
        await new Promise(res => setTimeout(res, delay));
        return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  // Function to format Gemini API response for better readability
  const formatGeminiResponse = (responseText) => {
    if (!responseText) return "No information found for this query.";

    // Replace bold markdown (**) with <strong> and underline headings
    // Example: **Heading:** -> <u><strong>Heading</strong></u>:
    // This regex looks for **Text:** or **Text** and transforms it
    const formattedText = responseText
      .replace(/\*\*(.*?)\:\*\*/g, '<u><strong>$1</strong></u>:') // Matches **Text:**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Matches **Text** for general bolding
      .replace(/\n/g, '<br/>'); // Replace newlines with <br/> for HTML rendering

    return formattedText;
  };


  // Send text or image parts to Gemini API
  const sendToGemini = async (newParts) => {
    setLoading(true);
    setErrorMessage("");

    // Add user message to state immediately
    setMessages((prev) => [...prev, { sender: "user", parts: newParts }]);
    setInput("");

    try {
      const chatHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: msg.parts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      }));

      chatHistory.push({
        role: 'user',
        parts: newParts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      });

      const payload = { contents: chatHistory };

      const response = await exponentialBackoffFetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const rawReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const formattedReply = formatGeminiResponse(rawReply); // Format the reply

      if (formattedReply) {
        // Store as HTML string for rendering
        setMessages((prev) => [...prev, { sender: "bot", parts: [{ html: formattedReply }] }]);
      } else {
        console.error("Gemini API returned an unexpected response structure:", data);
        setMessages((prev) => [...prev, { sender: "bot", parts: [{ text: "Sorry, I couldn't get a clear response. Please try again." }] }]);
      }
    } catch (error) {
      console.error("Error communicating with Gemini API:", error);
      setErrorMessage("Failed to connect to the analysis service. Please check your network and try again.");
      setMessages((prev) => [...prev, { sender: "bot", parts: [{ text: "Error fetching analysis." }] }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!input.trim() || loading) return;
    await sendToGemini([{ text: input }]);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || loading) return;

    setLoading(true);
    setErrorMessage("");
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];
      await sendToGemini([{ inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } }]);
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read image file.");
      setLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const capturePhoto = async () => {
    if (!webcamRef.current || loading) return;

    setLoading(true);
    setErrorMessage("");
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setErrorMessage("Failed to capture image from webcam.");
      setLoading(false);
      return;
    }

    const base64 = imageSrc.split(",")[1];
    await sendToGemini([{ inlineData: { mimeType: "image/jpeg", data: base64 } }]);
    setShowCamera(false);
  };

  const handleVoiceInputStart = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setErrorMessage("");
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("SpeechRecognition start error:", e);
        setErrorMessage("Microphone access blocked or failed to start. Please check permissions.");
        setIsListening(false);
      }
    }
  };

  const handleVoiceInputStop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage("");
    setInput("");
  };

  // New: Function to toggle camera facing mode
  const toggleFacingMode = useCallback(() => {
    setFacingMode(prevMode => (prevMode === "user" ? "environment" : "user"));
  }, []);


  return (
    <div className="analysis-container">
      {/* Embedded CSS for this component */}
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --primary-color: #3498db;
    --primary-hover-color: #2980b9;
    --secondary-color: #2ecc71;
    --secondary-hover-color: #27ae60;
    --accent-color: #9b59b6;
    --accent-hover-color: #8e44ad;

    --bg-gradient-start: #74ebd5;
    --bg-gradient-end: #9face6;

    --card-bg-color: #ffffff;
    --text-color: #2c3e50;
    --light-text-color: #7f8c8d;
    --border-color: #e0e0e0;
    --shadow-color: rgba(0, 0, 0, 0.08);
    --input-bg: #f9f9f9;
    --input-border: #dcdcdc;
    --user-chat-bg: #e3f2fd;
    --bot-chat-bg: #f0f0f0;
    --loading-color: #8e44ad;
    --error-color: #e74c3c;
    --error-bg: #fbecec;
    --active-mic-color: #e74c3c;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .analysis-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
  }

  .analysis-box {
    background-color: var(--card-bg-color);
    border-radius: 16px;
    box-shadow: 0 10px 30px var(--shadow-color);
    width: 100%;
    max-width: 700px;
    display: flex;
    flex-direction: column;
    padding: 30px;
    gap: 20px;
    min-height: 80vh;
  }

  .analysis-box h1 {
    font-size: 2.2em;
    color: var(--primary-color);
    text-align: center;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .chat-box {
    flex-grow: 1;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 15px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
    background-color: var(--input-bg);
    min-height: 300px;
    max-height: 50vh;
  }

  .chat-message {
    margin-bottom: 10px;
    padding: 12px 18px;
    border-radius: 20px;
    max-width: 85%;
    font-size: 0.95em;
    line-height: 1.5;
    word-wrap: break-word;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  }

  .chat-message.user {
    align-self: flex-end;
    background-color: var(--user-chat-bg);
    color: var(--text-color);
    border-bottom-right-radius: 5px;
  }

  .chat-message.bot {
    align-self: flex-start;
    background-color: var(--bot-chat-bg);
    color: var(--text-color);
    border-bottom-left-radius: 5px;
  }

  .chat-message.bot p { margin: 0; padding: 0; line-height: 1.6; }
  .chat-message.bot u {
    text-decoration: none;
    border-bottom: 2px solid var(--primary-color);
    padding-bottom: 2px;
    display: inline-block;
  }
  .chat-message.bot strong {
    font-size: 1.1em;
    color: var(--primary-color);
  }

  .chat-message img {
    max-width: 100%;
    border-radius: 10px;
    margin-top: 10px;
    height: auto;
  }

  .loading {
    text-align: center;
    font-style: italic;
    color: var(--loading-color);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
  }

  .loading .spinner { animation: spin 1s linear infinite; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  .error-message {
    background-color: var(--error-bg);
    color: var(--error-color);
    padding: 10px 15px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9em;
    margin-top: 10px;
    border: 1px solid var(--error-color);
  }

  textarea {
    width: 100%;
    padding: 15px;
    border: 1px solid var(--input-border);
    border-radius: 12px;
    font-size: 1em;
    resize: vertical;
    min-height: 60px;
    box-sizing: border-box;
    background-color: var(--input-bg);
    color: var(--text-color);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
  }

  .button-group button {
    flex: 1;
    min-width: 120px;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1.05em;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .button-group button.primary-btn { background-color: var(--primary-color); color: white; }
  .button-group button.primary-btn:hover:not(:disabled) {
    background-color: var(--primary-hover-color);
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  }

  .button-group button.secondary-btn { background-color: var(--secondary-color); color: white; }
  .button-group button.secondary-btn:hover:not(:disabled) {
    background-color: var(--secondary-hover-color);
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  }

  .button-group button.accent-btn { background-color: var(--accent-color); color: white; }
  .button-group button.accent-btn:hover:not(:disabled) {
    background-color: var(--accent-hover-color);
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  }

  .button-group button.mic-listening {
    background-color: var(--active-mic-color);
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
    100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
  }

  .button-group button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
    opacity: 0.7;
  }

  /* ✅ Tablet View */
  @media (max-width: 768px) {
    .analysis-box { padding: 20px; min-height: 90vh; gap: 15px; }
    .analysis-box h1 { font-size: 1.8em; margin-bottom: 15px; }
    .chat-box { max-height: 40vh; }
    .chat-message { font-size: 0.9em; padding: 10px 15px; }
    .button-group { flex-direction: column; gap: 10px; }
    .button-group button { width: 100%; min-width: unset; }
  }

  /* ✅ Small Mobile View */
  @media (max-width: 480px) {
    .analysis-box { padding: 15px; min-height: 95vh; gap: 12px; }
    .analysis-box h1 { font-size: 1.5em; }
    .chat-box { min-height: 200px; max-height: 35vh; font-size: 0.85em; padding: 10px; }
    .chat-message { font-size: 0.85em; padding: 8px 12px; }
    textarea { padding: 10px; font-size: 0.9em; }
    .button-group { gap: 8px; }
    .button-group button { font-size: 0.9em; padding: 10px; border-radius: 8px; }
  }
`}</style>


      <div className="analysis-box">
        <h1><MessageSquare size={32} /> Tablet & Tonic Analysis</h1>

        {errorMessage && (
          <div className="error-message">
            <AlertTriangle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="chat-box" ref={chatBoxRef}>
          {messages.length === 0 && (
            <p className="loading" style={{ color: '#7f8c8d', fontStyle: 'normal' }}>
              <Info size={18} /> Start by typing a question or uploading an image.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.sender === "user" ? "chat-message user" : "chat-message bot"}
            >
              {/* Render HTML content directly if 'html' property exists */}
              {msg.parts.map((part, idx) =>
                part.text ? (
                  <p key={idx}>{part.text}</p>
                ) : part.html ? (
                  <div key={idx} dangerouslySetInnerHTML={{ __html: part.html }} />
                ) : (
                  <img
                    key={idx}
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="uploaded for analysis"
                  />
                )
              )}
            </div>
          ))}
          {loading && (
            <p className="loading">
              <Loader2 size={20} className="spinner" /> Analyzing...
            </p>
          )}
        </div>

        {showCamera && (
          <div className="camera-container">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: facingMode }} // Dynamic facing mode
              width="100%"
              height="auto"
            />
            <div className="camera-buttons">
              <button onClick={capturePhoto} disabled={loading} className="secondary-btn">
                <Camera size={20} /> Capture
              </button>
              <button onClick={toggleFacingMode} disabled={loading} className="flip-button">
                <FlipHorizontal size={20} /> Flip Camera
              </button>
              <button onClick={() => setShowCamera(false)} disabled={loading} className="secondary-btn">
                <XCircle size={20} /> Close
              </button>
            </div>
          </div>
        )}

        {!showCamera && (
          <>
            <textarea
              placeholder="Enter tablet/tonic name, symptoms, or a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !loading) {
                  e.preventDefault();
                  handleAnalyzeText();
                }
              }}
              disabled={loading || isListening}
            />
            <div className="button-group">
              <button
                onClick={handleAnalyzeText}
                disabled={loading || !input.trim() || isListening}
                className="primary-btn"
              >
                <Send size={20} /> Send Message
              </button>
              <button
                onClick={isListening ? handleVoiceInputStop : handleVoiceInputStart}
                disabled={loading}
                className={`accent-btn ${isListening ? 'mic-listening' : ''}`}
              >
                {isListening ? <StopCircle size={20} /> : <Mic size={20} />} {isListening ? 'Stop Listening' : 'Voice Input'}
              </button>
              <button onClick={() => setShowCamera(true)} disabled={loading || isListening} className="secondary-btn">
                <Camera size={20} /> Capture Image
              </button>
              <button onClick={() => fileInputRef.current.click()} disabled={loading || isListening} className="secondary-btn">
                <Upload size={20} /> Upload Image
              </button>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
                capture="environment" // Hint for mobile to open camera directly
              />
              <button onClick={handleClearChat} disabled={loading || messages.length === 0} className="accent-btn">
                <Trash2 size={20} /> Clear Chat
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
