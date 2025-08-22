import React, { useState, useRef, useEffect, useCallback } from "react";
// Import icons from lucide-react (ensure you have installed it: npm install lucide-react)
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageCircle, // For Ask Doctor title
  Mic, // Microphone icon for voice input
  StopCircle, // Stop recording icon
  Trash2, // Clear chat icon
  Clipboard, // Copy to clipboard icon
  FileText, // Export TXT icon
  Download, // General download icon for PDF
  XCircle, // For close button on status messages
  User, // ADDED: User icon for chat messages
  Bot, // ADDED: Bot icon for chat messages
} from 'lucide-react';

// For PDF generation, jsPDF needs to be imported.
// Make sure to install: npm install jspdf
import jsPDF from "jspdf";

export default function AskDoctor() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]); // Stores { sender: 'user'/'bot', text: '...', html?: '...' }
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(""); // For copy/export feedback
  const [isListening, setIsListening] = useState(false); // State for voice input
  const [isTyping, setIsTyping] = useState(false); // New: Bot typing indicator

  const chatBoxRef = useRef(null); // Ref for scrolling to bottom
  const recognitionRef = useRef(null); // Ref for SpeechRecognition instance
  const inputRef = useRef(null); // ADDED: Ref for the input field

  // Your Gemini API key (IMPORTANT: Never hardcode in production environment)
  const API_KEY = "AIzaSyDykTtPcnGg-FRH1eXrzidHjH-smrCXehs";
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

  // Scroll to bottom of chat box
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [history, loading, isTyping]); // Depend on history, loading, and typing to scroll

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Only get results when speech ends
      recognitionRef.current.interimResults = false; // Only final results
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        // FIX: Ensure transcript is always a string
        const transcript = String(event.results[0][0].transcript || '');
        setInputAndSend(transcript); // Set input and trigger send
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        setErrorMessage(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setStatusMessage(""); // Clear listening status
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setStatusMessage(""); // Clear listening status
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
  }, []); // Empty dependency array means this runs once on mount

  // Helper to set input and prepare to send
  const setInputAndSend = (text) => {
    setQuestion(text);
    // Auto-send if text is detected immediately from voice
    if (text.trim()) {
      setTimeout(() => handleAsk(text), 100);
    }
  };

  // Exponential backoff for API calls
  const exponentialBackoffFetch = async (url, options, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 && retries > 0) { // Too Many Requests
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

  // Function to format Gemini API response for better readability (HTML output for chat display)
  const formatGeminiResponse = (responseText) => {
    if (!responseText) return "No information found.";

    let formattedHtml = responseText
      // Convert Markdown bold (**) to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert Markdown headings (## Heading) to <h3> with underline
      .replace(/^##\s*(.*)$/gm, '<h3><u>$1</u></h3>')
      // Convert Markdown bullet points (- Item or * Item) to <li>
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      .replace(/^\* (.*)$/gm, '<li>$1</li>');

    // Wrap lists in <ul> tags if they exist and are not already wrapped
    if (formattedHtml.includes('<li>') && !formattedHtml.includes('<ul>')) {
      formattedHtml = formattedHtml.replace(/(<li>.*?<\/li>)+/gs, '<ul>$1</ul>');
    }

    // Replace newlines that are not part of an existing list or heading with <br/>
    formattedHtml = formattedHtml.replace(/(?<!<\/li>)\n(?!<h3|<ul)/g, '<br/>');

    return formattedHtml;
  };

  // New function to convert HTML to structured plain text for exports
  const htmlToStructuredPlainText = (htmlString) => {
    if (!htmlString) return "";

    // Create a temporary div to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    let plainText = '';
    tempDiv.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Trim and append text node content
            const trimmedText = node.textContent.trim();
            if (trimmedText) plainText += trimmedText + ' ';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const textContent = node.textContent.trim(); // Get text content of the element

            switch (tagName) {
                case 'h3':
                    // Convert to Markdown H2, add newlines before and after
                    plainText += `\n## ${textContent}\n`;
                    break;
                case 'strong':
                    // Convert to Markdown bold
                    plainText += `**${textContent}**`;
                    break;
                case 'li':
                    // Convert to indented bullet point
                    plainText += `  - ${textContent}\n`;
                    break;
                case 'ul':
                    // Add newlines before and after the list content
                    plainText += '\n';
                    node.childNodes.forEach(li => {
                        if (li.tagName.toLowerCase() === 'li') {
                            plainText += `  - ${li.textContent.trim()}\n`;
                        }
                    });
                    plainText += '\n';
                    break;
                case 'br':
                    // Convert <br/> to newline
                    plainText += '\n';
                    break;
                case 'p':
                    // Paragraph with double newline for separation
                    plainText += `${textContent}\n\n`;
                    break;
                default:
                    // Default for other tags, just append text content
                    plainText += textContent + ' ';
            }
        }
    });

    // Final cleanup: remove extra spaces, multiple newlines
    plainText = plainText.replace(/ +\n/g, '\n').replace(/\n\n+/g, '\n\n').trim();
    return plainText;
  };


  const handleAsk = async (questionTextParam = question) => { // Rename parameter to avoid confusion
    // FIX: Ensure questionTextParam is always a string and trimmed
    const currentQuestionText = String(questionTextParam || '').trim();

    if (!currentQuestionText) {
      setErrorMessage("Please type a question before asking.");
      setTimeout(() => setErrorMessage(""), 3000); // Clear message after 3 seconds
      return;
    }

    if (loading || isListening) return; // Prevent multiple submissions or during voice input

    setLoading(true);
    setErrorMessage("");
    setStatusMessage(""); // Clear any previous status messages

    const userQuestion = currentQuestionText; // Use the validated, trimmed question text
    setQuestion(""); // Clear input immediately for better UX

    // Add user question to history immediately
    setHistory((prev) => [...prev, { sender: "user", text: userQuestion }]);
    // Add a temporary bot message placeholder and show typing indicator
    setHistory((prev) => [...prev, { sender: "bot", text: "..." }]);
    setIsTyping(true);

    try {
      // Prepare chat history for conversational context, ensuring model parts are plain text
      // It's crucial that the `model` role in `contents` has plain text, not HTML.
      const chatHistory = history.map(item => ({
        role: item.sender === "user" ? "user" : "model",
        parts: [{ text: item.text ? item.text.replace(/<[^>]*>?/gm, '') : htmlToStructuredPlainText(item.html || '') }] // FIX: Add || '' for safety
      }));

      // Add the current user question to the history for this request
      chatHistory.push({ role: "user", parts: [{ text: userQuestion }] });

      const payload = { contents: chatHistory };

      const response = await exponentialBackoffFetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const formattedResponse = formatGeminiResponse(rawResponseText);

      // Update the last entry in history with the actual answer
      setHistory((prev) => {
        const newHistory = [...prev];
        // Find the placeholder and replace it with the actual answer
        const lastBotIndex = newHistory.findLastIndex(msg => msg.sender === "bot" && msg.text === "...");
        if (lastBotIndex !== -1) {
            newHistory[lastBotIndex] = { sender: "bot", html: formattedResponse };
        } else {
            // Fallback: If no placeholder found (e.g., direct voice input), just append
            newHistory.push({ sender: "bot", html: formattedResponse });
        }
        return newHistory;
      });

    } catch (err) {
      console.error("Gemini API error:", err);
      setErrorMessage("Failed to get answer. Please check your network or try again.");
      // Update the last entry to indicate error
      setHistory((prev) => {
        const newHistory = [...prev];
        const lastBotIndex = newHistory.findLastIndex(msg => msg.sender === "bot" && msg.text === "...");
        if (lastBotIndex !== -1) {
          newHistory[lastBotIndex] = { sender: "bot", text: "❌ Error: Could not get an answer." };
        } else {
          newHistory.push({ sender: "bot", text: "❌ Error: Could not get an answer." });
        }
        return newHistory;
      });
    } finally {
      setLoading(false);
      setIsTyping(false); // Hide typing indicator
    }
  };

  // Start voice recognition
  const handleVoiceInputStart = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setErrorMessage("");
      setStatusMessage("Listening... Speak clearly.");
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("SpeechRecognition start error:", e);
        setErrorMessage("Microphone access blocked or failed to start. Please check permissions.");
        setIsListening(false);
        setStatusMessage("");
      }
    }
  };

  // Stop voice recognition (manual stop)
  const handleVoiceInputStop = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatusMessage("");
    }
  };

  // Clear chat messages
  const handleClearChat = () => {
    setHistory([]);
    setQuestion("");
    setErrorMessage("");
    setStatusMessage("Chat history cleared! ✨");
    setTimeout(() => setStatusMessage(""), 3000); // Clear message after 3 seconds
  };

  // ADDED: Function to clear the input field
  const handleClearInput = () => {
    setQuestion("");
    if (inputRef.current) {
      inputRef.current.focus(); // Keep focus on input after clearing
    }
  };

  // Export chat history to TXT
  const exportTxt = () => {
    if (history.length === 0) {
      setErrorMessage("No chat history to export.");
      return;
    }
    // Extract plain text from history entries, including questions and answers
    const textData = history.map(h => {
        if (h.sender === "user") {
            return `Q: ${h.text}`;
        } else {
            // Use the new htmlToStructuredPlainText for bot's answer
            const plainTextAnswer = h.html ? htmlToStructuredPlainText(h.html) : String(h.text || ''); // FIX: Add || '' for safety
            return `A: ${plainTextAnswer}`;
        }
    }).filter(line => line.trim() !== "").join("\n\n"); // Filter empty lines

    const blob = new Blob([textData], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "doctor_chat_history.txt";
    document.body.appendChild(link); // Append to body to make it clickable in all browsers
    link.click();
    document.body.removeChild(link); // Clean up
    setStatusMessage("TXT exported successfully! 📄");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Export chat history to PDF
  const exportPDF = () => {
    if (history.length === 0) {
      setErrorMessage("No chat history to export.");
      return;
    }

    const pdf = new jsPDF();
    pdf.setFont("helvetica");
    pdf.setFontSize(10); // Slightly smaller font for more content
    let y = 15; // Initial Y position
    const margin = 10;
    const pageHeight = pdf.internal.pageSize.height;

    // Helper to add text and manage page breaks
    const addTextWithPageBreaks = (text, x, currentY) => {
      // Split text by lines, then further split by size if too long
      const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.width - 2 * margin);
      lines.forEach(line => {
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(line, x, currentY);
        currentY += 7; // Line height
      });
      return currentY;
    };


    history.forEach((item, index) => {
      if (item.sender === "user") {
        y = addTextWithPageBreaks(`Q: ${item.text}`, margin, y);
        y += 3; // Space after question
      } else {
        // Use the new htmlToStructuredPlainText for bot's answer
        const plainTextAnswer = item.html ? htmlToStructuredPlainText(item.html) : String(item.text || ''); // FIX: Ensure text is string too
        y = addTextWithPageBreaks(`A: ${plainTextAnswer}`, margin, y);
        y += 7; // Space after answer
      }
      if (y > pageHeight - 30 && index < history.length - 1) { // Check if next entry will exceed page
        pdf.addPage();
        y = margin + 5; // Reset y for new page with some top margin
      }
    });

    pdf.save("doctor_chat_history.pdf");
    setStatusMessage("PDF exported successfully! 📄");
    setTimeout(() => setStatusMessage(""), 3000);
  };

  // Copy chat history to clipboard
  const copyToClipboard = () => {
    if (history.length === 0) {
      setErrorMessage("No chat history to copy.");
      return;
    }
    const textData = history.map(h => {
        if (h.sender === "user") {
            return `Q: ${h.text}`;
        } else {
            // Use the new htmlToStructuredPlainText for bot's answer
            const plainTextAnswer = h.html ? htmlToStructuredPlainText(h.html) : String(h.text || ''); // FIX: Add || '' for safety
            return `A: ${plainTextAnswer}`;
        }
    }).filter(line => line.trim() !== "").join("\n\n");

    // Use document.execCommand('copy') for better compatibility in iframes
    const textArea = document.createElement("textarea");
    textArea.value = textData;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setStatusMessage("Chat copied to clipboard! ✅");
    } catch (err) {
      console.error('Failed to copy text:', err);
      setErrorMessage("Failed to copy to clipboard.");
    }
    document.body.removeChild(textArea);
    setTimeout(() => setStatusMessage(""), 3000);
  };

  return (
    <div className="ask-doctor-container">
      {/* Embedded CSS for this component */}
      <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --primary-blue: #0077b6;
    --primary-blue-dark: #005f8a;
    --secondary-blue: #00b4d8;
    --secondary-blue-dark: #0096c7;
    --accent-green: #2ecc71;
    --accent-green-dark: #27ae60;
    --text-dark: #333;
    --text-light: #555;
    --bg-light-blue: #e1f5fe;
    --bg-light-green: #d1f7c4;
    --gradient-start: #6dd5ed;
    --gradient-end: #2193b0;
    --card-bg: rgba(255, 255, 255, 0.95);
    --border-light: #ddd;
    --shadow-strong: rgba(0,0,0,0.15);
    --error-bg: #f8d7da;
    --error-text: #721c24;
    --status-success-bg: #d4edda;
    --status-success-text: #155724;
    --active-mic-color: #e74c3c;
  }

  body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
    color: var(--text-dark);
  }

  .ask-doctor-container {
    min-height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    box-sizing: border-box;
  }

  .chat-wrapper {
    background: var(--card-bg);
    border-radius: 20px;
    padding: 20px;
    width: 100%;
    max-width: 700px;
    box-shadow: 0px 12px 30px var(--shadow-strong);
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: fadeIn 0.6s ease-out;
    gap: 15px;
  }

  .title {
    text-align: center;
    font-size: 2em;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--primary-blue);
  }

  .chat-box {
    width: 100%;
    height: 60vh;
    min-height: 300px;
    overflow-y: auto;
    border: 2px solid var(--border-light);
    border-radius: 12px;
    padding: 12px;
    background: #fdfdfd;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chat-entry {
    display: flex;
    flex-direction: column;
    max-width: 90%;
  }

  .chat-question, .chat-answer {
    padding: 10px 14px;
    border-radius: 14px;
    line-height: 1.5;
    font-size: 0.95em;
    word-wrap: break-word;
  }

  .chat-question {
    background: var(--primary-blue);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 5px;
  }

  .chat-answer {
    background: var(--bg-light-blue);
    color: var(--text-dark);
    align-self: flex-start;
    border-bottom-left-radius: 5px;
  }

  .input-box {
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
    position: relative;
  }

  .input-box input {
    flex: 1;
    padding: 12px;
    border: 2px solid var(--border-light);
    border-radius: 10px;
    font-size: 1em;
  }

  .clear-input-button {
    position: absolute;
    right: 100px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
  }

  .input-box button {
    background: var(--primary-blue);
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.95em;
  }

  .input-box .mic-button {
    background: var(--accent-green);
  }

  .export-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .export-buttons button {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 0.9em;
  }

/* ✅ Mobile First Adjustments */
@media (max-width: 768px) {
  .chat-wrapper {
    padding: 15px;
    border-radius: 15px;
  }
  .title {
    font-size: 1.6em;
  }
  .chat-box {
    height: 55vh;
    min-height: 250px;
    font-size: 0.9em;
  }
  .input-box {
    flex-direction: column;
    gap: 6px;
  }
  .input-box input,
  .input-box button {
    width: 100%;
    font-size: 1em;
  }
  .clear-input-button {
    right: 10px;
  }
  .export-buttons {
    flex-direction: column;
    gap: 6px;
  }
  .export-buttons button {
    width: 100%;
  }
}

/* ✅ Extra small devices (phones under 480px) */
@media (max-width: 480px) {
  .chat-wrapper {
    width: 100%;
    padding: 8px;
    border-radius: 10px;
    box-sizing: border-box;
  }

  .title {
    font-size: 1.2em;
    text-align: center;
  }

  .chat-box {
    width: 100%;
    height: 45vh;     /* reduce so input area fits */
    font-size: 0.85em;
    padding: 8px;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .input-box {
    flex-direction: column;
    width: 100%;
    gap: 5px;
  }

  .input-box input {
    width: 100%;
    padding: 10px;
    font-size: 0.9em;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .input-box button {
    width: 100%;
    font-size: 0.9em;
    padding: 10px;
    border-radius: 8px;
  }

  .clear-input-button {
    right: 6px;
    top: 6px;
    font-size: 0.8em;
  }

  .export-buttons {
    flex-direction: column;
    gap: 5px;
    width: 100%;
  }

  .export-buttons button {
    width: 100%;
    font-size: 0.85em;
    padding: 8px;
    border-radius: 6px;
  }
}


  }
`}</style>

      <div className="chat-wrapper">
        <h2 className="title"><MessageCircle size={36} /> Ask Doctor</h2>

        {/* Status Messages (Success/Error) */}
        {(errorMessage || statusMessage) && (
          <div className={`status-message ${errorMessage ? 'error' : 'success'}`}>
            {errorMessage ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span>{errorMessage || statusMessage}</span>
            <button className="close-btn" onClick={() => { setErrorMessage(""); setStatusMessage(""); }}>
              <XCircle size={18} />
            </button>
          </div>
        )}

        <div className="chat-box" ref={chatBoxRef}>
          {history.length === 0 && !loading && (
            <p className="loading" style={{ color: '#7f8c8d', fontStyle: 'normal' }}>
              Ask me anything about medical conditions, symptoms, or general health advice.
            </p>
          )}
          {history.map((item, index) => (
            <div key={index} className={`chat-entry ${item.sender}`}>
              {item.sender === "user" ? (
                // ADDED: User icon and content wrapper
                <div className="chat-entry-content">
                  <User size={20} className="chat-icon user-icon" />
                  <div className="chat-question">You: {item.text}</div>
                </div>
              ) : (
                // ADDED: Bot icon and content wrapper
                <div className="chat-entry-content">
                  <Bot size={20} className="chat-icon bot-icon" />
                  <div className="chat-answer">
                    {/* Render HTML content if available, otherwise plain text */}
                    {item.html ? (
                      <div dangerouslySetInnerHTML={{ __html: item.html }} />
                    ) : (
                      item.text === "..." ? (
                        <div className="loading-dots">
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                        </div>
                      ) : (
                        item.text
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Bot typing indicator, shown only if loading and not already showing a message placeholder */}
          {loading && isTyping && history[history.length - 1]?.text !== "..." && (
            <div className="chat-entry bot">
              {/* ADDED: Bot icon for typing indicator */}
              <div className="chat-entry-content">
                <Bot size={20} className="chat-icon bot-icon" />
                <div className="chat-answer">
                  <div className="loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="input-box">
          <input
            type="text"
            value={question}
            placeholder={isListening ? "Listening..." : "Type your question here..."}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading && !isListening && question.trim()) {
                e.preventDefault(); // Prevent new line in input
                handleAsk();
              }
            }}
            disabled={loading || isListening}
            ref={inputRef /* Corrected: Inline comment syntax for ref prop */}
          />
          <button onClick={() => handleAsk(question)} disabled={loading || !question.trim() || isListening}>
            <Send size={20} /> Ask
          </button>
          <button
            onClick={isListening ? handleVoiceInputStop : handleVoiceInputStart}
            disabled={loading}
            className={`mic-button ${isListening ? 'listening' : ''}`}
          >
            {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {history.length > 0 && (
          <div className="export-buttons">
            <button onClick={exportTxt} disabled={loading}>
              <FileText size={20} /> Export TXT
            </button>
            <button onClick={exportPDF} disabled={loading}>
              <Download size={20} /> Export PDF
            </button>
            <button onClick={copyToClipboard} disabled={loading}>
              <Clipboard size={20} /> Copy Chat
            </button>
            <button onClick={handleClearChat} disabled={loading} className="clear-chat-btn">
              <Trash2 size={20} /> Clear Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
