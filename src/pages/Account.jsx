import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../src/firebaseconfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import "./Account.css";

export default function Account() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setDetails(docSnap.data());
          } else {
            setDetails(null);
          }
        } catch (err) {
          console.error("Error fetching details:", err);
          setDetails(null);
        }
      } else {
        setDetails(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const downloadQRImage = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "my_qr.png";
    link.click();
  };

  const downloadQRPDF = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("My Health QR Code", 20, 20);
    pdf.addImage(url, "PNG", 20, 30, 100, 100);
    pdf.save("my_qr.pdf");
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      window.location.href = "/login";
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your details...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="account-container">
        <h2>No details found</h2>
        <p>Please go to the QR Generator page to fill in your information.</p>
      </div>
    );
  }

  return (
    <div className="account-container">
      <div className="account-card">
        <h2 className="account-title">My Account</h2>

        <div className="account-buttons">
          <button className="btn" onClick={() => alert(JSON.stringify(details, null, 2))}>
            Show My Details
          </button>
          <button className="btn" onClick={handleLogout}>
            Log Out
          </button>
          <button className="btn secondary" onClick={() => alert("Settings page coming soon!")}>
            Settings
          </button>
        </div>

        <div ref={qrRef} className="qr-container">
          <QRCodeCanvas value={JSON.stringify(details)} size={200} />
        </div>

        <div className="download-buttons">
          <button className="btn" onClick={downloadQRImage}>
            Download QR (PNG)
          </button>
          <button className="btn secondary" onClick={downloadQRPDF}>
            Download QR (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
