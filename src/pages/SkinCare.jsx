import React, { useState, useRef, useEffect } from "react";
import "./SkinCare.css";
import jsPDF from "jspdf";
import { FaMicrophone, FaSearch, FaStopCircle, FaMoon, FaSun, FaImage, FaCamera } from "react-icons/fa";

const FaceRemedies = () => {
  const [query, setQuery] = useState("");
  const [remedyData, setRemedyData] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [utterance, setUtterance] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [skinConditions, setSkinConditions] = useState({
    Pimples: false,
    Acne: false,
    "Dark Circles": false,
    "Black Skin": false,
    "Dry Skin": false,
    "Oily Skin": false,
    "Dull Skin": false,
    Wrinkles: false
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const GEMINI_API_KEY = "AIzaSyDsDZJmml18dqhEwVDPSoZdhesZStaBDJ0";

  const problems = [
    "Pimples", "Acne", "Dark Circles", "Black Skin", "Dry Skin",
    "Oily Skin", "Dull Skin", "Wrinkles", "Tanning",
  ];

  // Initialize webcam
  useEffect(() => {
    if (showWebcam) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [showWebcam]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      alert("Could not access webcam. Please check permissions.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], "webcam-photo.jpg", { type: "image/jpeg" });
        setImage(file);
        setPreview(URL.createObjectURL(blob));
        setShowWebcam(false);
        
        // Simulate skin analysis
        const detectedConditions = { ...skinConditions };
        Object.keys(detectedConditions).forEach(condition => {
          detectedConditions[condition] = Math.random() > 0.7;
        });
        setSkinConditions(detectedConditions);
      }, 'image/jpeg', 0.9);
    }
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      const detectedConditions = { ...skinConditions };
      Object.keys(detectedConditions).forEach(condition => {
        detectedConditions[condition] = Math.random() > 0.7;
      });
      setSkinConditions(detectedConditions);
    }
  };

  const handleSearch = () => fetchRemedy(query);

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setListening(true);
      setQuery("Listening...");
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setListening(false);
      setQuery("");
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      fetchRemedy(transcript);
    };
    
    recognition.start();
  };

  const speakText = (text) => {
    stopVoice();
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.rate = 1;
    window.speechSynthesis.speak(newUtterance);
    setUtterance(newUtterance);
  };

  const stopVoice = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setUtterance(null);
  };

  const fetchRemedy = async (problem) => {
    if (!problem.trim() && !image) return;
    setLoading(true);
    setRemedyData("");
    stopVoice();

    const prompt = `Suggest 4-6 simple natural home remedies for skin issue: ${problem}. 
If image is provided, analyze the skin condition and suggest remedies. 
Use bullet points with common kitchen/home ingredients. Do not use markdown symbols.`;

    try {
      let body;

      if (image) {
        const base64Image = await toBase64(image);
        body = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: image.type,
                    data: base64Image.split(",")[1],
                  },
                },
              ],
            },
          ],
        };
      } else {
        body = { contents: [{ parts: [{ text: prompt }] }] };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error(`API request failed with status ${res.status}`);

      const data = await res.json();
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No remedy found.";

      const formatted = result
        .split(/\d+\.\s*/)
        .filter(Boolean)
        .map((line) => `➤ ${line.trim()}`)
        .join("\n\n");

      setRemedyData(formatted);
      speakText(formatted);
    } catch (err) {
      console.error(err);
      setRemedyData("❌ Sorry, something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportTxt = () => {
    if (!remedyData) return;
    const blob = new Blob([remedyData], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "skin-remedy.txt";
    link.click();
  };

  const exportPDF = () => {
    if (!remedyData) return;
    const pdf = new jsPDF();
    const lines = remedyData.split("\n");
    let y = 20;
    pdf.setFont("helvetica");
    pdf.setFontSize(12);
    
    lines.forEach((line) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 10, y);
      y += 10;
    });
    
    pdf.save("skin-remedy.pdf");
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  return (
    <div className={`main-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="topbar">
        <h1 className="title">🌿 Face Remedies</h1>
        <button className="dark-toggle" onClick={toggleDarkMode}>
          {darkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>

      <div className="problem-buttons">
        {problems.map((item) => (
          <button key={item} onClick={() => fetchRemedy(item)}>
            {item}
          </button>
        ))}
      </div>

      {showWebcam && (
        <div className="webcam-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="webcam-video"
            style={{ transform: darkMode ? 'scaleX(-1)' : 'scaleX(1)' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="webcam-controls">
            <button className="capture-btn" onClick={capturePhoto}>
              <FaCamera /> Capture
            </button>
            <button className="cancel-btn" onClick={() => setShowWebcam(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {preview && !showWebcam && (
        <div className="image-preview">
          <img src={preview} alt="Skin analysis" />
          <p>📷 {image?.name === "webcam-photo.jpg" ? "Captured Photo" : "Uploaded Image"} for Skin Analysis</p>
          
          <table className="skin-analysis-table">
            <thead>
              <tr>
                {Object.keys(skinConditions).map(condition => (
                  <th key={condition}>{condition}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Object.values(skinConditions).map((detected, index) => (
                  <td key={index}>{detected ? "✅" : ""}</td>
                ))}
              </tr>
            </tbody>
          </table>
          
          <p className="running-indicator">Analyzing skin...</p>
        </div>
      )}

      <div className="remedy-box">
        <h2>🧴 Home Remedy</h2>
        {loading ? (
          <div className="spinner-container">
            <div className="loader"></div>
            <p>Analyzing skin and preparing remedies...</p>
          </div>
        ) : (
          <pre className="remedy-content">{remedyData || "No remedy found. Please search for a skin issue."}</pre>
        )}
      </div>

      <div className="search-box">
        <input
          type="text"
          value={query}
          placeholder="Ask your skin problem..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button 
          className={`mic ${listening ? 'active' : ''}`} 
          onClick={handleVoiceInput}
          aria-label="Voice input"
        >
          <FaMicrophone />
        </button>
        <button className="search-btn" onClick={handleSearch}>
          <FaSearch /> Search
        </button>
        <button className="search-btn stop" onClick={stopVoice}>
          <FaStopCircle /> Stop Voice
        </button>
        <label className="upload-btn">
          <FaImage /> Upload Image
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </label>
        <button className="webcam-btn" onClick={() => setShowWebcam(true)}>
          <FaCamera /> Webcam
        </button>
      </div>

      {!loading && remedyData && (
        <div className="bottom-controls">
          <button onClick={exportTxt}>📄 Export as TXT</button>
          <button onClick={exportPDF}>📄 Export as PDF</button>
        </div>
      )}
    </div>
  );
};

export default FaceRemedies;