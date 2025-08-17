import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";
import { onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import "./QRGenerator.css";

export default function QRGenerator() {
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    disease: "",
    allergies: "",
    address: "",
    parentName: "",
    parentContact: "",
    emergencyContact: "",
    doctorName: "",
    doctorContact: ""
  });
  const [loading, setLoading] = useState(true);
  const qrRef = useRef();

  // Fetch saved data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFormData(docSnap.data());
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveDetails = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first.");
      return;
    }
    try {
      await setDoc(doc(db, "users", user.uid), formData);
      alert("✅ Details saved permanently!");
    } catch (err) {
      console.error("Error saving data:", err);
      alert("❌ Failed to save data.");
    }
  };

  // Download QR as PNG
  const downloadPNG = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "Health_QR.png";
    a.click();
  };

  // Download QR as PDF
  const downloadPDF = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Health QR Code", 70, 20);
    pdf.addImage(imgData, "PNG", 40, 40, 130, 130);
    pdf.save("Health_QR.pdf");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your details...</p>
      </div>
    );
  }

  const qrValue = JSON.stringify(formData);

  return (
    <div className="qr-bg">
      <div className="qr-wrapper">
        <div className="qr-card glass">
          <h2 className="qr-title">✨ Generate Your Health QR Code ✨</h2>

          <form className="qr-grid">
            <div>
              <label>Full Name</label>
              <input name="name" value={formData.name} onChange={handleChange} />

              <label>Date of Birth</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} />

              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>

              <label>Blood Group</label>
              <input name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} />

              <label>Known Diseases</label>
              <input name="disease" value={formData.disease} onChange={handleChange} />

              <label>Allergies</label>
              <input name="allergies" value={formData.allergies} onChange={handleChange} />

              <label>Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange}></textarea>
            </div>

            <div className="qr-right">
              <label>Parent Name</label>
              <input name="parentName" value={formData.parentName} onChange={handleChange} />

              <label>Parent Contact</label>
              <input name="parentContact" value={formData.parentContact} onChange={handleChange} />

              <label>Emergency Contact</label>
              <input name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} />

              <label>Family Doctor Name</label>
              <input name="doctorName" value={formData.doctorName} onChange={handleChange} />

              <label>Doctor Contact</label>
              <input name="doctorContact" value={formData.doctorContact} onChange={handleChange} />

              <div className="qr-code-container" ref={qrRef}>
                <QRCodeCanvas value={qrValue} size={180} />
              </div>

              <div className="btn-group">
                <button type="button" onClick={saveDetails} className="qr-btn">💾 Save</button>
                <button type="button" onClick={downloadPNG} className="qr-btn secondary">⬇️ PNG</button>
                <button type="button" onClick={downloadPDF} className="qr-btn secondary">⬇️ PDF</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
