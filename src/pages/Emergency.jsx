import React, { useState, useEffect } from "react";
import "./Emergency.css";

export default function Emergency() {
  const [countdown, setCountdown] = useState(null);

  // Countdown effect
  useEffect(() => {
    let timer;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      window.location.href = "tel:108"; // auto-call ambulance
      setCountdown(null);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Share live location with emergency message (opens WhatsApp general chat screen)
  const sendLocationToWhatsApp = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const message = `🚨 Emergency! Please send help immediately.\n📍 My Location: ${mapsUrl}`;

        // This opens WhatsApp with message ready to forward to ANY chat (top 5 will show)
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
      });
    } else {
      alert("Geolocation not supported by your browser.");
    }
  };

  return (
    <div className="emergency-container">
      <div className="emergency-card">
        <div className="emergency-icon">🚨</div>
        <h2>Emergency Contact</h2>
        <p>If you are in an emergency, call immediately:</p>

        <div className="emergency-buttons">
          <a href="tel:108" className="btn call-btn">📞 Call Ambulance (108)</a>
          <a href="sms:108?body=I%20need%20urgent%20help" className="btn sms-btn">✉️ Send SMS</a>
          <a href="https://wa.me/91108?text=I%20need%20urgent%20help"
             target="_blank" rel="noopener noreferrer"
             className="btn whatsapp-btn">💬 WhatsApp</a>
          <button className="btn location-btn" onClick={sendLocationToWhatsApp}>
            📍 Share Location (WhatsApp)
          </button>
          <button className="btn timer-btn" onClick={() => setCountdown(5)}>
            ⏱ Auto-Call in 5s
          </button>
        </div>

        {countdown !== null && (
          <p className="countdown">📞 Calling in {countdown} seconds…</p>
        )}

        <p className="note">
          ⚠️ Your emergency message will open in WhatsApp — please forward it quickly to your **top 5 chats** for fastest help.
        </p>

        <div className="tips-section">
          <h3>⚕️ Quick First-Aid Tips</h3>
          <ul>
            <li><b>Heart Attack:</b> Call help, keep the patient calm, give aspirin if available.</li>
            <li><b>Bleeding:</b> Apply pressure with a clean cloth, keep injured part elevated.</li>
            <li><b>Burns:</b> Cool with running water, don’t apply ice or butter.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
