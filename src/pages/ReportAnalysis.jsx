import React, { useState, useRef, useEffect, useCallback } from "react";
// Import icons from lucide-react (ensure you have installed it: npm install lucide-react)
import {
  Camera,
  RotateCcw, // For retaking image
  CheckCircle, // For success messages
  AlertCircle, // For error messages
  Loader2, // For loading spinner
  FlipHorizontal, // For camera flip
  FileText, // For Report Analysis title
  Upload, // For document upload
  ScanLine, // For QR code scanner
  XCircle, // For closing messages/camera
  FileWarning, // For unsupported file types
  Download, // For download functionality
  Copy, // For copy to clipboard
  StopCircle, // For stopping QR scan
} from 'lucide-react';

// For QR Code scanning
// IMPORTANT: You must add the jsQR library to your HTML file (e.g., public/index.html)
// by placing this <script> tag in the <head> or before the closing </body> tag:
// <script src="https://cdn.jsdelivr.net/npm/jsQR@1.4.0/dist/jsQR.min.js"></script>
// For PDF export: Add this script tag:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js"></script>
// Without these, the respective functionalities will not work.


export default function HealthReportAnalysis() {
  const videoRef = useRef(null); // For camera stream (image capture)
  const canvasRef = useRef(null); // For capturing image from camera
  const fileInputRef = useRef(null); // Ref for file input
  const qrCanvasRef = useRef(null); // Canvas for QR scanning
  const qrVideoRef = useRef(null); // Video element for QR scanning

  const [capturedImage, setCapturedImage] = useState(null); // Base64 string of captured/uploaded image
  const [analysisResult, setAnalysisResult] = useState(""); // HTML formatted AI result
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null); // MODIFIED: Changed initial state to null to hold JSX
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' (back) or 'user' (front) for camera capture
  const [cameraStream, setCameraStream] = useState(null); // To manage camera stream for stopping
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'upload', 'qr'
  const [qrScanResult, setQrScanResult] = useState(''); // Stores the text content of scanned QR code
  const [isQrScanning, setIsQrScanning] = useState(false); // State to control QR scanning loop
  const [isCameraActive, setIsCameraActive] = useState(false); // State to control manual camera activation
  const [isVideoReady, setIsVideoReady] = useState(false); // NEW: State to track if video stream is ready to capture


  // Your Gemini API key (IMPORTANT: Keep private in production. For hackathon demo, direct embed is common.)
  const GEMINI_API_KEY = "AIzaSyDykTtPcnGg-FRH1eXrzidHjH-smrCXehs";

  // Effect to manage camera stream for image capture or QR scanning
  useEffect(() => {
    const startCamera = async (forQR = false) => {
      // Stop any existing camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setCapturedImage(null); // Clear image when camera restarts or mode changes
      setErrorMessage(null); // MODIFIED: Clear any previous camera errors by setting to null
      setIsVideoReady(false); // NEW: Reset video ready state

      try {
        const videoConstraints = {
          facingMode: forQR ? 'environment' : facingMode, // Prefer back camera for QR, respect facingMode for general camera
          width: 1280, // High res for QR detection / better document clarity
          height: 720
        };
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });

        if (forQR && qrVideoRef.current) {
          qrVideoRef.current.srcObject = stream;
        } else if (!forQR && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStream(stream);
      } catch (err) {
        console.error("Error accessing camera:", err);
        if (err.name === "NotAllowedError") {
          setErrorMessage(
            <>
              <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
              Camera access denied. Please grant permission in your browser settings.
            </>
          );
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setErrorMessage(
            <>
              <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
              No camera found. Please ensure a camera is connected and enabled.
            </>
          );
        } else {
          setErrorMessage(
            <>
              <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
              Failed to access camera. Please try again.
            </>
          );
        }
        // If camera fails to start, ensure isCameraActive is false and video is not ready
        setIsCameraActive(false); 
        setIsVideoReady(false); // NEW: Ensure video is not marked ready on error
      }
    };

    // MODIFIED: Only start camera if scanMode is 'camera' AND isCameraActive is true
    if (scanMode === 'camera') {
      if (isCameraActive) { // Only start if manually activated
        startCamera(false);
      } else { // If camera is not active, stop any existing stream
          if (cameraStream) {
              cameraStream.getTracks().forEach(track => track.stop());
              setCameraStream(null);
          }
          setIsVideoReady(false); // NEW: Ensure video is not ready if camera is not active
      }
      setIsQrScanning(false); // Ensure QR scanner is off
    } else if (scanMode === 'qr') {
      startCamera(true);
      setIsQrScanning(true); // Start QR scanning loop
      setIsCameraActive(false); // Ensure manual camera is off if switching to QR
      setIsVideoReady(false); // NEW: Reset video ready state for QR mode
    } else { // 'upload' mode or initial state
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setIsQrScanning(false);
      setIsCameraActive(false); // Ensure manual camera is off if switching to upload
      setIsVideoReady(false); // NEW: Reset video ready state for upload mode
    }

    // Cleanup function to stop camera when component unmounts or mode changes
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setIsQrScanning(false); // Stop QR scanning loop on unmount
      setIsVideoReady(false); // NEW: Reset video ready state on unmount
    };
  }, [scanMode, facingMode, isCameraActive]); // ADDED: isCameraActive to dependency array

  // QR Scanning Loop
  useEffect(() => {
    if (isQrScanning && qrVideoRef.current && qrCanvasRef.current) {
      const video = qrVideoRef.current;
      const canvas = qrCanvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true }); // optimize for read operations

      let animationFrameId;

      const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

          // Check if jsQR is available globally
          if (typeof window.jsQR !== 'undefined') {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code) {
              console.log("QR Code detected:", code.data);
              setQrScanResult(code.data);
              setIsQrScanning(false); // Stop scanning after detection
              // Immediately analyze QR data if detected
              analyzeQrData(code.data);
              return; // Exit tick to prevent further scanning
            }
          } else {
            if (!errorMessage) { // Prevent spamming error message if already set
              setErrorMessage(
                <>
                  <FileWarning size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
                  QR scanner library (jsQR) not loaded. Please ensure the script is included in your HTML.
                </>
              );
            }
          }
        }
        animationFrameId = requestAnimationFrame(tick);
      };

      animationFrameId = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    } else {
      setIsQrScanning(false); // Ensure loop stops if conditions aren't met
    }
  }, [isQrScanning, errorMessage]); // Re-run if `isQrScanning` changes or `errorMessage` updates

  // Function to toggle camera facing mode for image capture
  const toggleFacingMode = useCallback(() => {
    setFacingMode(prevMode => (prevMode === "user" ? "environment" : "user"));
  }, []);

  // Function to capture an image from the live camera feed
  const captureImage = () => {
    // MODIFIED: Ensure videoRef and canvasRef are valid AND video is ready
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) { // Check readyState
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          Camera not ready or canvas not found. Please wait for camera stream to load.
        </>
      ); 
      return;
    }
    setErrorMessage(null); // MODIFIED: Clear previous errors by setting to null

    const video = videoRef.current;
    const canvas = canvasRef.current; 

    // Set canvas dimensions to match video feed or a reasonable default
    canvas.width = video.videoWidth > 0 ? video.videoWidth : 640;
    canvas.height = video.videoHeight > 0 ? video.videoHeight : 480;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg", 0.9); // Use JPEG for smaller size and faster transfer
    setCapturedImage(imageData);
    // After capturing, automatically stop the camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
    }
    setIsCameraActive(false); // Deactivate camera state
    setIsVideoReady(false); // NEW: Set video ready state to false after capture
  };

  // NEW: Handler to start the camera manually
  const handleStartCamera = useCallback(async () => {
    setErrorMessage(null); // MODIFIED: Clear previous errors by setting to null
    setCapturedImage(null); // Clear any old image
    setAnalysisResult(""); // Clear old analysis
    setQrScanResult(''); // Clear QR result
    setLoading(false); // Ensure loading is off

    // Set scanMode to camera if it's not already, to trigger the useEffect
    if (scanMode !== 'camera') {
        setScanMode('camera');
    }
    setIsCameraActive(true); // Activate camera state
    // Note: isVideoReady will be set to true by the video's onLoadedMetadata
  }, [scanMode]);

  // NEW: Handler to stop the camera manually
  const handleStopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false); // Deactivate camera state
    setIsVideoReady(false); // NEW: Set video ready state to false when stopping
    setErrorMessage(null); // MODIFIED: Clear any camera-related errors by setting to null
  }, [cameraStream]);


  // Function to format Gemini API response into structured HTML for display
  const formatGeminiResponse = (responseText) => {
    if (!responseText) return "No analysis result.";

    // Improved formatting: convert markdown to HTML for structured display
    let formattedHtml = responseText
      // Convert Markdown bold (**text**) to <strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert Markdown headings (## Heading) to <h3> with underline
      .replace(/^##\s*(.*)$/gm, '<h3><u>$1</u></h3>')
      // Convert Markdown bullet points (- Item or * Item) to <li>
      .replace(/^- (.*)$/gm, '<li>$1</li>')
      // Convert Markdown bullet points (* Item) to <li>
      .replace(/^\* (.*)$/gm, '<li>$1</li>');

    // Wrap lists in <ul> tags if they exist and are not already wrapped
    if (formattedHtml.includes('<li>') && !formattedHtml.includes('<ul>')) { // Ensure not double-wrapping
      formattedHtml = formattedHtml.replace(/(<li>.*?<\/li>)+/gs, '<ul>$1</ul>');
    }

    // Replace newlines that are not part of an existing list or heading with <br/>
    formattedHtml = formattedHtml.replace(/(?<!<\/li>)\n(?!<h3|<ul)/g, '<br/>');

    return formattedHtml;
  };

  // Core function to send content (image data or text) to Gemini for analysis
  const analyzeContent = async (contentParts, prompt) => {
    setLoading(true);
    setAnalysisResult("");
    setErrorMessage(null); // MODIFIED: Clear error message by setting to null

    try {
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...contentParts // Spread the content parts (inlineData for image, text for string)
            ]
          }
        ]
      };

      // Exponential backoff for API calls with a timeout
      const exponentialBackoffFetch = async (url, options, retries = 3, delay = 1000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 20000); // 20-second timeout for each attempt

        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id); // Clear timeout if fetch completes
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
          clearTimeout(id); // Ensure timeout is cleared on error too
          if (error.name === 'AbortError') {
            throw new Error("Analysis timed out. The model took too long to respond.");
          }
          if (retries > 0) {
            console.warn(`Fetch failed. Retrying in ${delay / 1000}s...`, error);
            await new Promise(res => setTimeout(res, delay));
            return exponentialBackoffFetch(url, options, retries - 1, delay * 2);
          }
          throw error;
        }
      };

      const genRes = await exponentialBackoffFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const genData = await genRes.json();
      let rawTextOutput = genData?.candidates?.[0]?.content?.parts?.[0]?.text;

      // FIX: Handle cases where Gemini returns no text or an empty string from its analysis
      if (!rawTextOutput || rawTextOutput.trim() === '') {
          rawTextOutput = "The AI could not extract meaningful information or generate an analysis from the provided content. Please ensure the document/QR code is clear, legible, and contains relevant health information. Try with a different document or image.";
      }

      const formattedOutput = formatGeminiResponse(rawTextOutput);
      setAnalysisResult(formattedOutput);

    } catch (err) {
      console.error("Analysis error:", err);
      // Display a user-friendly error message, including timeout errors
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          Analysis failed: {err.message || "An unexpected error occurred."} Please try again.
        </>
      );
      setAnalysisResult(""); // Clear previous result on error
    } finally {
      setLoading(false); // Ensure loading state is reset regardless of outcome
    }
  };

  // Analyze image (from camera or upload)
  const analyzeImage = async () => {
    if (!capturedImage) {
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          Please capture or upload an image first!
        </>
      );
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    const base64Data = capturedImage.split(",")[1];
    const mimeType = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    // MODIFIED PROMPT: Added instruction for a title
    const prompt = `Generate a comprehensive health report titled "**My Health Analysis Summary**". Then, provide a structured summary including:
- **Person Details:** Name, Age, Gender, Contact Info (if present in the document)
- **Health Details:** Key findings, diagnoses, relevant medical history, vital signs (if present in the document)
- **Health Tips & Suggestions:** Actionable advice based on the health details.
- **How to Overcome Health Problems:** Practical steps, lifestyle changes, or treatments suggested.

Use clear, underlined, and bolded headings for each section. Use bullet points for lists where appropriate. If information for a section is not found, state "Not found in document."`;
    await analyzeContent([{ inlineData: { mimeType: mimeType, data: base64Data } }], prompt);
  };

  // Analyze QR data (data is text-based)
  const analyzeQrData = async (qrDataToAnalyze = qrScanResult) => {
    if (!qrDataToAnalyze) {
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          No QR code data to analyze!
        </>
      );
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    // MODIFIED PROMPT: Added instruction for a title
    const prompt = `Generate a comprehensive health report titled "**QR Code Health Data Analysis**". Then, analyze the following QR code data for health details: "${qrDataToAnalyze}". Provide a structured summary including:
- **Person Details:** Name, Age, Gender, Contact Info (if present in the QR data)
- **Health Details:** Key findings, diagnoses, relevant medical history, vital signs (if present in the QR data)
- **Health Tips & Suggestions:** Actionable advice based on the health details.
- **How to Overcome Health Problems:** Practical steps, lifestyle changes, or treatments suggested.

Use clear, underlined, and bolded headings for each section. Use bullet points for lists where appropriate. If information for a section is not found, state "Not found in QR data." If the QR data contains a URL, try to indicate what kind of health information might be accessible there, but do not attempt to fetch external content.`;
    await analyzeContent([{ text: qrDataToAnalyze }], prompt);
    setQrScanResult(''); // Clear QR scan result after analysis attempt
  };


  // Handle file uploads (supporting images and text files, with guidance for others)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMessage(null); // MODIFIED: Clear previous error by setting to null
    setCapturedImage(null); // Clear previous capture/QR result
    setAnalysisResult(""); // Clear previous analysis result
    setIsCameraActive(false); // Ensure camera is stopped if uploading
    setIsVideoReady(false); // NEW: Reset video ready state on file upload
    
    const mimeType = file.type; // Define mimeType at the beginning of the function scope

    const reader = new FileReader();

    reader.onload = async (event) => {
      let prompt = `Analyze this medical document. Provide a structured summary including:
- **Person Details:** Name, Age, Gender, Contact Info (if present)
- **Health Details:** Key findings, diagnoses, relevant medical history, vital signs (if present)
- **Health Tips & Suggestions:** Actionable advice based on the health details.
- **How to Overcome Health Problems:** Practical steps, lifestyle changes, or treatments suggested.

Use clear, underlined, and bolded headings for each section. Use bullet points for lists where appropriate. If information for a section is not found, state "Not found in document."`;

      // Now use mimeType to decide how to process the file content
      if (mimeType.startsWith('image/')) {
        const base64 = event.target.result.split(',')[1];
        setCapturedImage(event.target.result); // Show uploaded image
        await analyzeContent([{ inlineData: { mimeType: mimeType, data: base64 } }], prompt);
      } else if (mimeType === 'text/plain') {
        const textContent = event.target.result;
        setCapturedImage(null); // No image preview for text files
        prompt = `Generate a comprehensive health report titled "**Text Document Analysis**". Then, analyze the following plain text medical document content: "${textContent}". ${prompt}`; // Adjust prompt for text content
        await analyzeContent([{ text: textContent }], prompt);
      } else if (mimeType === 'application/pdf' || mimeType.includes('wordprocessingml')) {
        // For PDFs and DOCX, set an immediate error message and stop loading
        setLoading(false);
        setErrorMessage(
          <>
            <FileWarning size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
            Direct visual analysis of multi-page PDFs or Word documents is not fully supported in the browser due to their complex internal structures.
            For analysis, please convert your document to a **high-resolution image (e.g., JPEG/PNG screenshot per page)** for comprehensive analysis,
            or **copy-paste relevant text** into a plain text file for upload.
          </>
        );
      } else {
        // Fallback for any other truly unsupported types
        setLoading(false);
        setErrorMessage(
          <>
            <FileWarning size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
            File type "{mimeType || 'unknown'}" is not directly supported for analysis.
            Please convert your document to an **image (JPEG/PNG)** or **plain text (.txt)**.
          </>
        );
      }
    }; // Closing bracket for reader.onload

    // This is the critical part to control WHEN and HOW to read the file
    if (mimeType.startsWith('image/')) {
        reader.readAsDataURL(file);
    } else if (mimeType === 'text/plain') {
        reader.readAsText(file); // Read as text for plain text files
    } else if (mimeType === 'application/pdf' || mimeType.includes('wordprocessingml')) {
        // For PDFs and DOCX, the error message is already set above in reader.onload
        // We don't need to read the file data for these unsupported types.
        // Skipping reader.readAsDataURL or readAsText here.
    } else {
        // For other unsupported types, the error message is set above in reader.onload
        // Skipping reader.readAsDataURL or readAsText here.
    }

    e.target.value = null; // Clear input to allow re-uploading the same file
  }; // Closing bracket for handleFileUpload

  const retakeImage = () => {
    setCapturedImage(null);
    setAnalysisResult("");
    setErrorMessage(null); // MODIFIED: Clear error message by setting to null
    setQrScanResult(''); // Clear QR result
    // Camera is handled by isCameraActive now
    setIsCameraActive(false); // Ensure camera is off when retaking
    setIsVideoReady(false); // NEW: Reset video ready state on retake

    // If switching back to camera mode, automatically activate it for user convenience
    if (scanMode === 'camera') {
        // We'll let the user click "Start Camera" if they want to reactive
        // the live stream after retaking/clearing.
    } else if (scanMode === 'qr') {
        setIsQrScanning(true); // Restart QR scanning loop
    }
  };

  // Export analysis to PDF
  const exportToPdf = () => {
    if (!analysisResult) {
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          No analysis result to export to PDF.
        </>
      );
      setTimeout(() => setErrorMessage(null), 3000); // Clear message after 3 seconds
      return;
    }
    // CRITICAL: Check if html2pdf is available (it must be loaded via a script tag in index.html)
    if (typeof window.html2pdf === 'undefined') {
        setErrorMessage(
            <>
                <FileWarning size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
                PDF export library (html2pdf.js) not loaded. Please ensure the script is included in your `public/index.html` file. Refer to the comments in `ReportAnalysis.jsx` for the exact script tag.
            </>
        );
        setTimeout(() => setErrorMessage(null), 7000); // Keep message longer for instructions
        return;
    }

    // Create a temporary element to render the PDF content with custom styling
    const element = document.createElement('div');
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    element.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; padding: 25mm; color: #333; line-height: 1.6; background-color: #ffffff;">
            <header style="text-align: center; margin-bottom: 25mm; padding-bottom: 10mm; border-bottom: 3px solid #0077b6;">
                <h1 style="color: #0077b6; font-size: 2.5em; margin: 0; font-weight: 800;">Health Report Analysis</h1>
                <p style="font-size: 1.1em; color: #666; margin-top: 10px;">Generated on: ${currentDate}</p>
            </header>

            <section style="background-color: #fcfcfc; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20mm; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <h2 style="color: #005f8a; font-size: 1.8em; margin-top: 0; margin-bottom: 15mm; border-bottom: 2px solid #a7d9ed; padding-bottom: 5mm;">
                    Analysis Results
                </h2>
                <div class="analysis-result-content-for-pdf">
                    ${analysisResult}
                </div>
            </section>

            <footer style="text-align: center; margin-top: 30mm; font-size: 0.8em; color: #999;">
                <p>Confidential &copy; Health Report Analysis Application</p>
                <p>This document is for informational purposes only and not a substitute for professional medical advice.</p>
            </footer>
        </div>

        <style>
            /* Specific styles for PDF output to ensure professional appearance */
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .analysis-result-content-for-pdf h3 {
                color: #005f8a; /* Consistent with primary, but distinct for subheadings */
                font-size: 1.4em;
                margin-top: 1.8em;
                margin-bottom: 0.8em;
                padding-bottom: 4px;
                border-bottom: 1px solid #c9d6ff; /* Lighter, subtle underline */
                font-weight: 700;
            }
            .analysis-result-content-for-pdf strong {
                color: #0077b6; /* Primary color for bold text */
                font-weight: 600;
            }
            .analysis-result-content-for-pdf ul {
                list-style-type: disc;
                margin-left: 30px; /* More indent */
                padding-left: 0;
                margin-top: 1em;
                margin-bottom: 1em;
            }
            .analysis-result-content-for-pdf li {
                margin-bottom: 0.5em;
                line-height: 1.5;
            }
            .analysis-result-content-for-pdf p {
                margin-bottom: 1.2em;
                line-height: 1.7;
            }
        </style>
    `;

    const opt = {
      margin:       [15, 15, 15, 15], // More balanced margins (top, left, bottom, right in mm)
      filename:     `health_report_analysis_${currentDate.replace(/\s/g, '_')}.pdf`, // Dynamic filename
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 3, logging: true, dpi: 192, letterRendering: true, useCORS: true }, // Higher scale for better clarity
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().from(element).set(opt).save();
    setErrorMessage(
      <>
        <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
        Analysis exported to PDF successfully!
      </>
    ); // MODIFIED: Use JSX for success message too
    setTimeout(() => setErrorMessage(null), 3000); // MODIFIED: Clear success message after 3 seconds
  };

  // Export analysis to TXT
  const exportToTxt = () => {
    if (!analysisResult) {
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          No analysis result to export to TXT.
        </>
      );
      setTimeout(() => setErrorMessage(null), 3000); // Clear message after 3 seconds
      return;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = analysisResult;
    const plainText = tempDiv.innerText; // Get plain text from HTML

    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'health_report_analysis.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setErrorMessage(
      <>
        <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
        Analysis exported to TXT successfully!
      </>
    ); // MODIFIED: Use JSX for success message too
    setTimeout(() => setErrorMessage(null), 3000); // MODIFIED: Clear success message after 3 seconds
  };

  // Copy analysis to clipboard
  const copyToClipboard = () => {
    if (!analysisResult) {
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          No analysis result to copy.
        </>
      );
      setTimeout(() => setErrorMessage(null), 3000); // Clear message after 3 seconds
      return;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = analysisResult;
    const plainText = tempDiv.innerText;

    // Use document.execCommand('copy') for better iframe compatibility
    try {
      const el = document.createElement('textarea');
      el.value = plainText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setErrorMessage(
        <>
          <CheckCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          Analysis copied to clipboard!
        </>
      ); // MODIFIED: Use JSX for success message too
    } catch (err) {
      console.error('Failed to copy text:', err);
      setErrorMessage(
        <>
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/>
          Failed to copy analysis to clipboard. Please copy manually.
        </>
      ); // MODIFIED: Use JSX for error message too
    }
    setTimeout(() => setErrorMessage(null), 3000); // MODIFIED: Clear success/error message after 3 seconds
  };


  return (
    <div className="analysis-container">
      {/* Embedded CSS for this component */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
            --primary-color: #0077b6; /* Main blue for buttons/accents */
            --primary-hover: #005f8a;
            --secondary-color: #00b4d8; /* Lighter blue for capture/upload */
            --secondary-hover: #009ac2;
            --accent-color: #f39c12; /* Orange for flip/QR scan */
            --accent-hover: #e67e22;
            --danger-color: #e74c3c; /* Red for errors/retake */
            --danger-hover: #c0392b;

            --bg-gradient-start: #c9d6ff; /* Light blue start */
            --bg-gradient-end: #e2e2e2;   /* Light gray end */

            --card-bg: white;
            --text-color: #333;
            --light-text: #666;
            --border-color: #ddd;
            --shadow-light: rgba(0,0,0,0.1);
            --shadow-dark: rgba(0,0,0,0.2);

            --success-bg: #d4edda;
            --success-text: #155724;
            --error-bg: #f8d7da;
            --error-text: #721c24;
        }

        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: var(--text-color);
        }

        .analysis-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
        }

        .report-analysis-box {
            background: var(--card-bg);
            padding: 30px;
            border-radius: 18px;
            max-width: 800px; /* Increased max-width */
            width: 100%;
            text-align: center;
            box-shadow: 0px 10px 30px var(--shadow-dark);
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .report-analysis-box h1 {
            font-size: 2.5em;
            color: var(--primary-color);
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            text-align: center; /* Ensure title is centered */
            width: 100%; /* Ensure title takes full width for centering */
        }

        video {
            width: 100%;
            max-width: 640px; /* Adjusted max width for video */
            height: auto;
            border-radius: 15px;
            box-shadow: 0 4px 15px var(--shadow-light);
            background-color: #000;
            margin-bottom: 15px;
        }

        /* Hidden Canvas */
        canvas {
            display: none;
        }

        .mode-selection-buttons {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .mode-selection-buttons button {
            background: #f0f0f0;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 500;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 5px var(--shadow-light);
        }
        .mode-selection-buttons button.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .mode-selection-buttons button:hover:not(.active):not(:disabled) {
            background: #e0e0e0;
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }


        .action-buttons-row {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        button {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1.1em;
            font-weight: 600;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 5px var(--shadow-light);
        }

        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
        }

        button:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        button:disabled {
            background: #cccccc;
            color: #666;
            cursor: not-allowed;
            opacity: 0.8;
            box-shadow: none;
            transform: none;
        }

        .capture-btn {
            background: var(--secondary-color);
        }
        .capture-btn:hover:not(:disabled) {
            background: var(--secondary-hover);
        }

        .flip-camera-btn {
            background: var(--accent-color);
        }
        .flip-camera-btn:hover:not(:disabled) {
            background: var(--accent-hover);
        }
        .retake-btn {
            background: var(--danger-color);
        }
        .retake-btn:hover:not(:disabled) {
            background: var(--danger-hover);
        }
        .upload-btn {
            background: var(--secondary-color);
        }
        .upload-btn:hover:not(:disabled) {
            background: var(--secondary-hover);
        }
        /* NEW: Styles for camera control buttons */
        .camera-control-btn {
            background: #6a0dad; /* Purple for control buttons */
        }
        .camera-control-btn.stop-camera {
            background: var(--danger-color); /* Red for stop */
        }
        .camera-control-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
        }
        .camera-control-btn.stop-camera:hover:not(:disabled) {
            background: var(--danger-hover);
        }


        .captured-image-preview {
            margin-top: 20px;
            padding: 15px;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 8px var(--shadow-light);
            text-align: left; /* Align content to left */
        }
        .captured-image-preview h3 {
            color: var(--primary-color);
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .captured-image-preview img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 2px 8px var(--shadow-light);
            margin-bottom: 15px; /* Space below image */
        }

        .analysis-result-box {
            margin-top: 25px;
            text-align: left;
            padding: 20px;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 8px var(--shadow-light);
            min-height: 100px;
        }
        .analysis-result-box h3 {
            color: var(--primary-color);
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1.3em;
        }

        /* Styling for structured analysis output */
        .analysis-result-content { /* Added for scrollable content */
            max-height: 300px; /* Limit height */
            overflow-y: auto; /* Enable vertical scroll if content overflows */
            padding-right: 10px; /* Add some padding for scrollbar */
        }
        .analysis-result-content u {
            text-decoration: none; /* Remove default underline */
            border-bottom: 2px solid var(--primary-color); /* Custom underline */
            padding-bottom: 2px;
            display: inline-block; /* Ensures padding works */
            margin-bottom: 5px; /* Space below underlined heading */
        }
        .analysis-result-content strong {
            font-size: 1.1em; /* Slightly larger for bolded text */
            color: var(--primary-color); /* Bold text color */
        }
        .analysis-result-content ul {
            list-style-type: disc; /* Bullet points */
            margin-left: 25px; /* Deeper indent for lists */
            padding-left: 0;
            margin-top: 10px;
            margin-bottom: 10px;
        }
        .analysis-result-content li {
            margin-bottom: 5px;
            color: var(--text-color);
        }
        .analysis-result-content p {
            margin-bottom: 10px;
            line-height: 1.6;
        }

        /* Loading and Error Messages */
        .status-message {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 20px;
            margin-top: 15px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 0.95em;
            gap: 10px;
            width: fit-content;
            margin-left: auto;
            margin-right: auto;
            animation: slideInFromTop 0.5s ease-out;
            border: 1px solid;
        }
        .status-message.error {
            background-color: var(--error-bg);
            color: var(--error-text);
            border-color: var(--error-text);
        }
        .status-message.success { /* MODIFIED: Added success class styles */
            background-color: var(--success-bg);
            color: var(--success-text);
            border-color: var(--success-text);
        }
        .status-message.loading {
            background-color: #e0f2f7; /* Light blue loading background */
            color: #0077b6; /* Primary blue loading text */
            border-color: #a7d9ed;
        }
        .spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status-message .close-btn {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            margin-left: 10px;
            display: flex;
            align-items: center;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        .status-message .close-btn:hover {
            opacity: 1;
        }

        /* QR Scanner specific styles */
        .qr-scanner-view {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        .qr-scanner-view video {
          max-width: 100%;
          border-radius: 15px;
          box-shadow: 0 4px 15px var(--shadow-light);
          background-color: #000;
          transform: scaleX(1); /* Ensure QR video is not mirrored */
        }
        .qr-scan-result {
          font-weight: 500;
          color: var(--primary-color);
          word-break: break-all;
          margin-top: 10px;
          text-align: center;
          max-width: 100%;
          overflow-wrap: break-word;
        }
        .qr-scan-placeholder {
          color: var(--light-text);
          font-style: italic;
          margin-top: 10px;
        }


        /* Responsive adjustments */
        @media (max-width: 768px) {
          .report-analysis-box {
            padding: 20px;
            border-radius: 15px;
            gap: 15px;
          }
          .report-analysis-box h1 {
            font-size: 2em;
            margin-bottom: 15px;
          }
          .mode-selection-buttons button, .action-buttons-row button {
            padding: 10px 15px;
            font-size: 1em;
            flex: 1 1 auto; /* Allow more flexible wrapping */
          }
          .captured-image-preview, .analysis-result-box {
            padding: 15px;
          }
          video {
            max-width: 100%; /* Ensure video fits on small screens */
          }
        }

        @media (max-width: 480px) {
          .report-analysis-box {
            padding: 15px;
            gap: 10px;
          }
          .report-analysis-box h1 {
            font-size: 1.8em;
          }
          .mode-selection-buttons, .action-buttons-row {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="report-analysis-box">
        <h1><FileText size={36} /> Health Report Analysis</h1>

        {/* MODIFIED: Check if errorMessage is not null before rendering */}
        {errorMessage && (
          <div className="status-message error">
            {/* The icon is now part of the errorMessage JSX */}
            <span>{errorMessage}</span> 
            <button className="close-btn" onClick={() => setErrorMessage(null)}><XCircle size={18} /></button>
          </div>
        )}

        {/* Mode Selection Buttons (Always visible) */}
        <div className="mode-selection-buttons">
          <button
            onClick={() => { setScanMode('camera'); setCapturedImage(null); setAnalysisResult(''); setQrScanResult(''); setIsCameraActive(false); setIsVideoReady(false); setErrorMessage(null); }} // Reset camera states on mode change
            className={scanMode === 'camera' ? 'active' : ''}
            disabled={loading}
          >
            <Camera size={20} /> Capture Document
          </button>
          <button
            onClick={() => { setScanMode('upload'); setCapturedImage(null); setAnalysisResult(''); setQrScanResult(''); setIsCameraActive(false); setIsVideoReady(false); setErrorMessage(null); }} // Reset camera states on mode change
            className={scanMode === 'upload' ? 'active' : ''}
            disabled={loading}
          >
            <Upload size={20} /> Upload Document
          </button>
          <button
            onClick={() => { setScanMode('qr'); setCapturedImage(null); setAnalysisResult(''); setQrScanResult(''); setIsCameraActive(false); setIsVideoReady(false); setErrorMessage(null); }} // Reset camera states on mode change
            className={scanMode === 'qr' ? 'active' : ''}
            disabled={loading}
          >
            <ScanLine size={20} /> QR Code Scan
          </button>
        </div>

        {/* Camera Capture Mode (Always rendered if scanMode is camera) */}
        {scanMode === 'camera' && (
          <>
            {!capturedImage && !isCameraActive && ( // Show Start Camera button if no image and camera is not active
              <div className="action-buttons-row">
                <button onClick={handleStartCamera} disabled={loading} className="camera-control-btn">
                  <Camera size={20} /> Start Camera
                </button>
              </div>
            )}
            
            {isCameraActive && !capturedImage && ( // Only show video and related controls if camera is active AND no image captured
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
                  onLoadedMetadata={() => setIsVideoReady(true)} // NEW: Set video ready when metadata loads
                ></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas> {/* Hidden canvas for image capture */}

                <div className="action-buttons-row">
                  <button onClick={captureImage} className="capture-btn" disabled={loading || !isVideoReady}> {/* NEW: Disable if video not ready */}
                    <Camera size={20} /> Capture Image
                  </button>
                  <button onClick={toggleFacingMode} className="flip-camera-btn" disabled={loading || !isVideoReady}> {/* NEW: Disable if video not ready */}
                    <FlipHorizontal size={20} /> Flip Camera
                  </button>
                  <button onClick={handleStopCamera} className="camera-control-btn stop-camera" disabled={loading}>
                    <StopCircle size={20} /> Stop Camera
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Upload Document Mode (Always rendered if scanMode is upload) */}
        {scanMode === 'upload' && ( 
          <div className="action-buttons-row">
            <input
              type="file"
              accept="image/*, application/pdf, .txt, .doc, .docx" // Allow various file types
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button onClick={() => fileInputRef.current.click()} className="upload-btn" disabled={loading || capturedImage}> 
              <Upload size={20} /> Select File to Upload
            </button>
          </div>
        )}

        {/* QR Code Scan Mode (Always rendered if scanMode is qr) */}
        {scanMode === 'qr' && (
          <div className="qr-scanner-view">
            {!qrScanResult && ( // Only show video if no QR result yet
              <>
                <video ref={qrVideoRef} autoPlay playsInline muted></video>
                <canvas ref={qrCanvasRef} style={{ display: 'none' }}></canvas> {/* Hidden canvas for QR processing */}
                {isQrScanning ? (
                  <p className="qr-scan-placeholder">Scanning for QR code...</p>
                ) : (
                  <p className="qr-scan-placeholder">Point camera at QR code</p>
                )}
                {/* Action buttons for QR mode */}
                <div className="action-buttons-row">
                    <button onClick={() => setIsQrScanning(prev => !prev)} disabled={loading}>
                        {isQrScanning ? <StopCircle size={20} /> : <ScanLine size={20} />} {isQrScanning ? 'Stop Scan' : 'Start Scan'}
                    </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Display Captured/Uploaded Image & Action Buttons (Always visible if content exists) */}
        {(capturedImage || qrScanResult) && (
          <div className="captured-image-preview">
            <h3>
              {capturedImage ? <Camera size={20} /> : <ScanLine size={20} />}
              {capturedImage ? 'Captured/Uploaded Document' : 'Scanned QR Code Data'}
              :
            </h3>
            {capturedImage && <img src={capturedImage} alt="Document for analysis" />}
            {qrScanResult && <p className="qr-scan-result">{qrScanResult}</p>} {/* Display QR text here */}

            <div className="action-buttons-row" style={{ marginTop: '15px' }}>
              <button onClick={retakeImage} className="retake-btn" disabled={loading}>
                <RotateCcw size={20} /> Retake / New
              </button>
              {capturedImage && ( // Only show Analyze Document button if an image is present
                <button onClick={analyzeImage} disabled={loading} className="primary-btn">
                  {loading ? <Loader2 size={20} className="spinner" /> : <CheckCircle size={20} />} Analyze Document
                </button>
              )}
              {qrScanResult && !capturedImage && !analysisResult && ( // Show Analyze QR Data if QR result exists, no image, and no analysis yet
                  <button onClick={() => analyzeQrData(qrScanResult)} disabled={loading}>
                      {loading ? <Loader2 size={20} className="spinner" /> : <CheckCircle size={20} />} Analyze QR Data
                  </button>
              )}
            </div>
          </div>
        )}

        {/* Analysis Result */}
        {analysisResult && (
          <div className="analysis-result-box">
            <h3><FileText size={20} /> Analysis Result:</h3>
            <div className="analysis-result-content" dangerouslySetInnerHTML={{ __html: analysisResult }} />

            {/* Export and Copy Buttons */}
            <div className="action-buttons-row" style={{ marginTop: '20px' }}>
              <button onClick={exportToPdf} disabled={loading} className="primary-btn">
                <Download size={20} /> Export PDF
              </button>
              <button onClick={exportToTxt} disabled={loading} className="primary-btn">
                <Download size={20} /> Export TXT
              </button>
              <button onClick={copyToClipboard} disabled={loading} className="primary-btn">
                <Copy size={20} /> Copy Data
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !analysisResult && ( // Show loading only if no result yet
          <div className="status-message loading">
            <Loader2 size={20} className="spinner" /> Analyzing report...
          </div>
        )}
      </div>
    </div>
  );
}
