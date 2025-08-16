// src/pages/tabletandtonicanalysis.jsx
import React, { useRef, useState, useEffect } from "react";

export default function TabletAndTonicAnalysis() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Your Gemini API key (⚠️ Keep private in production)
  const GEMINI_API_KEY = "AIzaSyDsDZJmml18dqhEwVDPSoZdhesZStaBDJ0";

  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/png");
    setCapturedImage(imageData);
  };

  const analyzeImage = async () => {
    if (!capturedImage) {
      alert("Please capture an image first!");
      return;
    }

    setLoading(true);
    setAnalysisResult("");

    try {
      // Convert Base64 to Blob
      const base64Data = capturedImage.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });

      // Prepare form data for Gemini API
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        "captured_image.png"
      );

      // Upload image first to Gemini's file API
      const uploadRes = await fetch(
        "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + GEMINI_API_KEY,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();
      const fileUri = uploadData.file?.uri;

      if (!fileUri) throw new Error("Image upload failed.");

      // Send file to Gemini 2.0 Flash for analysis
      const genRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: "Analyze this image and describe the tablet or tonic details." },
                  { fileData: { mimeType: "image/png", fileUri } }
                ]
              }
            ]
          }),
        }
      );

      const genData = await genRes.json();
      const textOutput = genData?.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis result.";
      setAnalysisResult(textOutput);
    } catch (err) {
      console.error("Analysis error:", err);
      setAnalysisResult("Error analyzing image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Tablet & Tonic Analysis</h1>

      {/* Video Feed */}
      <video ref={videoRef} autoPlay style={{ width: "400px", borderRadius: "10px" }}></video>
      <br />

      {/* Hidden Canvas for Capturing */}
      <canvas ref={canvasRef} width="400" height="300" style={{ display: "none" }}></canvas>

      {/* Buttons */}
      <div style={{ marginTop: "10px" }}>
        <button onClick={captureImage} style={{ marginRight: "10px", padding: "10px" }}>
          📸 Capture
        </button>
        <button onClick={analyzeImage} style={{ padding: "10px" }}>
          🔍 Analyze
        </button>
      </div>

      {/* Show Captured Image */}
      {capturedImage && (
        <div style={{ marginTop: "15px" }}>
          <h3>Captured Image:</h3>
          <img src={capturedImage} alt="Captured" style={{ width: "300px", borderRadius: "10px" }} />
        </div>
      )}

      {/* Show Analysis */}
      {loading ? (
        <p>Analyzing...</p>
      ) : (
        analysisResult && (
          <div style={{ marginTop: "15px" }}>
            <h3>Analysis Result:</h3>
            <p>{analysisResult}</p>
          </div>
        )
      )}
    </div>
  );
}
