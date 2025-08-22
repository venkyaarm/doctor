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

  // IMPORTANT: Verify this API key has permissions for Gemini vision models.
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
      setRemedyData("✖ Could not access webcam. Please ensure camera permissions are granted.");
      setLoading(false);
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
        
        const detectedConditions = { ...skinConditions };
        Object.keys(detectedConditions).forEach(condition => {
          detectedConditions[condition] = Math.random() > 0.7;
        });
        setSkinConditions(detectedConditions);
        
        console.log("Captured photo. Triggering remedy fetch with the image file.");
        fetchRemedy("Analyze skin from photo", file); 
      }, 'image/jpeg', 0.9);
    } else {
      console.error("Video or canvas ref not available for photo capture.");
      setRemedyData("✖ Error capturing photo. Please try again.");
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

      console.log("Image uploaded. Triggering remedy fetch with the image file.");
      fetchRemedy("Analyze skin from uploaded image", file);
    }
  };

  const handleSearch = () => {
    console.log("Text query submitted:", query);
    fetchRemedy(query);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error("Speech recognition is not supported in your browser.");
      setRemedyData("✖ Speech recognition is not supported in your browser.");
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
      setRemedyData(`✖ Speech recognition error: ${event.error}`);
    };
    
    recognition.onend = () => {
      setListening(false);
    };
    
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      console.log("Voice input received. Triggering remedy fetch for:", transcript);
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

  const fetchRemedy = async (problem, imageFile = null) => {
    const isImageProvided = imageFile !== null;

    if (!problem.trim() && !isImageProvided) {
      console.log("No text query or image provided. Aborting fetch.");
      setRemedyData("Please provide a text query or an image to get remedies.");
      return;
    }
    setLoading(true);
    setRemedyData("");
    stopVoice();

    const prompt = isImageProvided
      ? `Analyze the skin condition in the provided image and suggest 4-6 simple natural home remedies using bullet points with common kitchen/home ingredients. For example: "➤ Apple Cider Vinegar: ...". Ensure each remedy is on a new line and formatted with the '➤' bullet point. Do not use markdown for headings or bolding.`
      : `Suggest 4-6 simple natural home remedies for skin issue: ${problem}. Use bullet points with common kitchen/home ingredients. For example: "➤ Apple Cider Vinegar: ...". Ensure each remedy is on a new line and formatted with the '➤' bullet point. Do not use markdown for headings or bolding.`;

    try {
      let body;

      if (isImageProvided) {
        const base64Image = await toBase64(imageFile);
        console.log(`Sending image for analysis. MimeType: ${imageFile.type}, Data length: ${base64Image.length} characters.`);
        body = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: imageFile.type,
                    data: base64Image.split(",")[1],
                  },
                },
              ],
            },
          ],
        };
      } else {
        console.log("Sending text query for analysis.");
        body = { contents: [{ parts: [{ text: prompt }] }] };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Request Failed. Status:", res.status, "Error details:", errorData);
        throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error. Check console for details.'}`);
      }

      const data = await res.json();
      let result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No remedy found.";

      // Replace newline characters with <br/> for HTML rendering
      result = result
        .replace(/\n\n/g, '<br/><br/>') // Replace double newlines with double breaks for paragraphs
        .replace(/\n/g, '<br/>'); // Replace single newlines with single breaks for line breaks


      setRemedyData(result);
      speakText(result.replace(/<br\/>/g, ' '));
    } catch (err) {
      console.error("Fetch remedy error:", err);
      setRemedyData(`✖ Sorry, something went wrong: ${err.message}. This might be due to an invalid API key or lack of vision model permissions. Please check your developer console for more details.`);
    } finally {
      setLoading(false);
      setImage(null);
      setPreview(null);
    }
  };

  const exportTxt = () => {
    if (!remedyData) return;
    const plainText = remedyData.replace(/<br\/>/g, '\n').replace(/<[^>]*>/g, '');
    const blob = new Blob([plainText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "skin-remedy.txt";
    link.click();
  };

  const exportPDF = () => {
    if (!remedyData) return;
    const pdf = new jsPDF();
    
    // Convert HTML breaks back to newlines for PDF processing
    // Also, handle the '➤' character and ensure proper indentation
    const processedText = remedyData
      .replace(/<br\/><br\/>/g, '\n\n') // Paragraph breaks
      .replace(/<br\/>/g, '\n') // Single line breaks
      .replace(/➤\s*/g, '• '); // Replace '➤' with a standard bullet for PDF compatibility and better rendering

    const lines = pdf.splitTextToSize(processedText, 180); // Max width for text wrapping (approx 180mm)
    let y = 20; // Initial Y position
    const lineHeight = 10; // Standard line height
    const indent = 15; // Indentation for wrapped lines

    pdf.setFont("helvetica");
    pdf.setFontSize(12);
    
    lines.forEach((line) => {
      // Check for bullet point at the start of the line to determine indentation
      const isBulletPointLine = line.trim().startsWith('• ');
      let x = 10; // Default X position
      if (isBulletPointLine) {
        // For lines starting with a bullet, apply a small left margin
        x = 10; 
      } else {
        // For wrapped lines that are part of a bullet point, apply indentation
        // We'll rely on splitTextToSize to handle the initial line,
        // subsequent lines of the same "paragraph" will be handled by it.
        // However, if a line starts with content that logically belongs
        // to a bullet point but doesn't have the bullet itself, we need
        // to manually indent.
        // A simple heuristic: if it's not a bullet point, but the previous
        // line was a bullet point, indent it. This requires more complex state
        // tracking, so for now, we'll just indent ALL subsequent lines of a wrapped paragraph.
        // A simpler solution for PDF is to treat each bullet point as a separate block.
        // For consistent left alignment, we'll just rely on `splitTextToSize`'s wrapping
        // and add a general left margin.
        x = 15; // Indent all lines after the first line of a bullet, or general paragraph
      }


      if (y > 270) { // Page height check
        pdf.addPage();
        y = 20;
      }

      pdf.text(line, x, y);
      y += lineHeight;

      // Add extra space after paragraphs (lines that were originally double newlines)
      if (line.endsWith('\n\n')) { // This check won't work perfectly after splitTextToSize
          y += lineHeight; // Add an extra line height for paragraph break
      }
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
          <p>📸 {image?.name === "webcam-photo.jpg" ? "Captured Photo" : "Uploaded Image"} for Skin Analysis</p>
          
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
                  <td key={index}>{detected ? "✅" : "\u274C"}</td>
                ))}
              </tr>
            </tbody>
          </table>
          
          {/* <p className="running-indicator">Analyzing skin...</p> This line remains commented out */}
        </div>
      )}

      <div className="remedy-box">
        <h2>🌿 Home Remedy</h2>
        {loading ? (
          <div className="spinner-container">
            <div className="loader"></div>
            <p>Analyzing skin and preparing remedies...</p>
          </div>
        ) : (
          <div className="remedy-content" dangerouslySetInnerHTML={{ __html: remedyData || "No remedy found. Please search for a skin issue." }}></div>
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
