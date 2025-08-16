import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import "./TabletAndTonicAnalysis.css";

export default function TabletAndTonicAnalysis() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  const GEMINI_API_KEY = "AIzaSyDsDZJmml18dqhEwVDPSoZdhesZStaBDJ0";

  // Send text to Gemini API
  const handleAnalyzeText = async () => {
    if (!input.trim()) return;
    await sendToGemini([{ text: input }]);
    setInput("");
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await analyzeImage(file);
  };

  // Start camera
  const handleCaptureImage = () => {
    setShowCamera(true);
  };

  // Capture photo from webcam
  const capturePhoto = async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const base64 = imageSrc.split(",")[1];
    await sendToGemini([
      { inline_data: { mime_type: "image/jpeg", data: base64 } }
    ]);
    setShowCamera(false);
  };

  // Analyze image from file input
  const analyzeImage = async (file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(",")[1];
      await sendToGemini([{ inline_data: { mime_type: file.type, data: base64 } }]);
    };
    reader.readAsDataURL(file);
  };

  // Send request to Gemini API
  const sendToGemini = async (parts) => {
    setLoading(true);
    setMessages((prev) => [...prev, { sender: "user", parts }]);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
      setMessages((prev) => [...prev, { sender: "bot", parts: [{ text: reply }] }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { sender: "bot", parts: [{ text: "Error fetching analysis." }] }]);
    }

    setLoading(false);
  };

  return (
    <div className="analysis-container">
      <div className="analysis-box">
        <h1>💊 Tablet & Tonic Analysis</h1>

        <div className="chat-box">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={msg.sender === "user" ? "chat-message user" : "chat-message bot"}
            >
              {msg.parts.map((part, idx) =>
                part.text ? (
                  <p key={idx}>{part.text}</p>
                ) : (
                  <img
                    key={idx}
                    src={`data:${part.inline_data.mime_type};base64,${part.inline_data.data}`}
                    alt="uploaded"
                  />
                )
              )}
            </div>
          ))}
          {loading && <p className="loading">⏳ Analyzing...</p>}
        </div>

        {showCamera && (
          <div className="camera-container">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
            />
            <div className="camera-buttons">
              <button onClick={capturePhoto}>📸 Capture</button>
              <button onClick={() => setShowCamera(false)}>❌ Close</button>
            </div>
          </div>
        )}

        <textarea
          placeholder="Enter tablet/tonic name or question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="button-group">
          <button onClick={handleAnalyzeText} disabled={loading}>
            Send
          </button>
          <button onClick={handleCaptureImage}>📷 Capture Image</button>
          <button onClick={() => fileInputRef.current.click()}>📁 Upload Image</button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            capture="environment"
          />
        </div>
      </div>
    </div>
  );
}
