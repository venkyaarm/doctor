import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../src/firebaseconfig";
import { QRCodeCanvas } from "qrcode.react";
import { onAuthStateChanged } from "firebase/auth";
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

  // Fetch saved data from Firestore if exists
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
      alert("Details saved permanently!");
    } catch (err) {
      console.error("Error saving data:", err);
      alert("Failed to save data.");
    }
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
    <div className="qr-wrapper">
      <div className="qr-card">
        <h2 className="qr-title">Generate Your Health QR Code</h2>

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

          <div>
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

            <div className="qr-code-container">
              <QRCodeCanvas value={qrValue} size={180} />
            </div>
          </div>
        </form>

        <button type="button" onClick={saveDetails} className="qr-btn">
          Save & Generate
        </button>
      </div>
    </div>
  );
}
