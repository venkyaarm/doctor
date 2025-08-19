import React, { useState, useEffect } from "react";
import {
  getAuth,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const Settings = () => {
  const auth = getAuth();
  const [userEmail, setUserEmail] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handlePasswordReset = async () => {
    if (userEmail) {
      try {
        await sendPasswordResetEmail(auth, userEmail);
        alert("Password reset email sent! Check your inbox.");
      } catch (error) {
        alert("Error: " + error.message);
      }
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Logged out successfully!");
    } catch (error) {
      alert("Error logging out: " + error.message);
    }
  };

  return (
    <div className="settings-container">
      <h2>⚙ Settings</h2>

      {/* Username Section */}
      <div className="settings-item">
        <label>Email / Username:</label>
        <p>{userEmail || "Not logged in"}</p>
      </div>

      {/* Dark Mode Toggle */}
      <div className="settings-item">
        <label>Dark Mode:</label>
        <button className="btn" onClick={toggleDarkMode}>
          {darkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
        </button>
      </div>

      {/* Change Password */}
      <div className="settings-item">
        <label>Change Password:</label>
        <button className="btn" onClick={handlePasswordReset}>
          Send Reset Email
        </button>
      </div>

      {/* Help & Support */}
      <div className="settings-item">
        <label>Help & Support:</label>
        <p>
          For any issues, contact us at{" "}
          <a href="mailto:support@hospitalapp.com">support@hospitalapp.com</a>
        </p>
      </div>

      {/* Logout */}
      <div className="settings-item">
        <label>Logout:</label>
        <button className="btn logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* CSS Styles inside JSX */}
      <style>{`
        .settings-container {
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0px 4px 10px rgba(0,0,0,0.1);
          background: var(--bg-color);
          color: var(--text-color);
          transition: all 0.3s ease;
        }

        .settings-item {
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .settings-item label {
          font-weight: bold;
          margin-bottom: 6px;
        }

        .settings-container h2 {
          text-align: center;
          margin-bottom: 20px;
        }

        .btn {
          padding: 10px 15px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: #4a90e2;
          color: white;
          font-size: 14px;
          transition: background 0.3s;
        }

        .btn:hover {
          background: #357ab8;
        }

        .btn.logout {
          background: #e74c3c;
        }

        .btn.logout:hover {
          background: #c0392b;
        }

        a {
          color: #4a90e2;
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        /* Dark Mode */
        body.dark-mode {
          --bg-color: #1e1e1e;
          --text-color: #f4f4f4;
        }

        body {
          --bg-color: #f4f4f4;
          --text-color: #1e1e1e;
          background: var(--bg-color);
          color: var(--text-color);
        }
      `}</style>
    </div>
  );
};

export default Settings;