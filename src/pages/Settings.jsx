import React, { useState, useEffect } from 'react';
// No need to import Settings.css directly anymore as it's embedded below

// Import icons from lucide-react (make sure to install: npm install lucide-react)
import {
  User,
  Bell,
  Palette,
  Globe,
  Lock,
  Download,
  LogOut,
  Save,
  Loader,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Key,
  Mail,
  Phone,
} from 'lucide-react';

export default function Settings() {
  // State for various settings
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [enableAutoSave, setEnableAutoSave] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedTimeZone, setSelectedTimeZone] = useState('UTC');
  const [allowDataSharing, setAllowDataSharing] = useState(false);

  // Profile data (mock for now, would come from API)
  const [profileName, setProfileName] = useState('John Doe');
  const [profileEmail, setProfileEmail] = useState('john.doe@example.com');
  const [profilePhone, setProfilePhone] = useState('+1 123 456 7890');

  // UI state for loading and modals
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'deleteAccount' or 'logoutAllDevices'
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' }); // 'success' or 'error'

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark-theme', isDarkMode);
  }, [isDarkMode]);

  // Handle saving settings (mock API call)
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' }); // Clear previous messages

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('Saving settings:', {
        isDarkMode,
        enableAutoSave,
        emailNotifications,
        smsAlerts,
        selectedLanguage,
        selectedTimeZone,
        allowDataSharing,
        profileName,
        profileEmail,
        profilePhone,
      });

      setStatusMessage({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatusMessage({ type: 'error', message: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Function to open confirmation modal
  const openConfirmModal = (action) => {
    setModalAction(action);
    setShowConfirmModal(true);
  };

  // Function to handle modal confirmation
  const handleModalConfirm = async () => {
    setShowConfirmModal(false);
    setStatusMessage({ type: '', message: '' }); // Clear previous messages

    setIsSaving(true); // Use saving state for destructive actions too

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      if (modalAction === 'deleteAccount') {
        console.log('Account deleted!');
        setStatusMessage({ type: 'success', message: 'Account successfully deleted.' });
        // Redirect to login or home page after deletion
      } else if (modalAction === 'logoutAllDevices') {
        console.log('Logged out of all devices!');
        setStatusMessage({ type: 'success', message: 'Successfully logged out of all devices.' });
        // Force logout or token invalidation here
      }
    } catch (error) {
      console.error('Action failed:', error);
      setStatusMessage({ type: 'error', message: `Failed to complete action: ${modalAction}.` });
    } finally {
      setIsSaving(false);
      setModalAction(null); // Reset modal action
    }
  };

  return (
    <div className="settings-container">
      {/* Embedded CSS for this component */}
      <style>{`
        /* Import Google Fonts - Inter for a modern look */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        /* CSS Custom Properties (Variables) for Theming */
        :root {
          --font-family: 'Inter', sans-serif;

          /* Light Theme Colors */
          --primary-color: #2980b9;
          --primary-hover-color: #2471a3;
          --danger-color: #e74c3c;
          --danger-hover-color: #c0392b;
          --success-color: #27ae60;
          --success-hover-color: #229954;
          --secondary-button-color: #ecf0f1;
          --secondary-button-text: #34495e;
          --secondary-button-hover-bg: #dbe4e6;

          --bg-color: #f8f9fa; /* Lighter background */
          --card-bg-color: #ffffff;
          --border-color: #e0e0e0;
          --text-color: #34495e; /* Darker text for better contrast */
          --secondary-text-color: #7f8c8d;
          --input-bg-color: #fefefe;
          --input-border-color: #dcdcdc;
          --input-focus-border: var(--primary-color);
          --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); /* Stronger, softer shadow */
          --card-hover-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); /* More pronounced hover */

          --status-success-bg: #d4edda;
          --status-success-text: #155724;
          --status-error-bg: #f8d7da;
          --status-error-text: #721c24;

          --primary-color-rgb: 41, 128, 185; /* Default for light theme */
        }

        /* Dark Theme Colors */
        body.dark-theme {
          --primary-color: #5dade2;
          --primary-hover-color: #4da6da;
          --danger-color: #f1948a;
          --danger-hover-color: #e67e73;
          --success-color: #52be80;
          --success-hover-color: #47a873;
          --secondary-button-color: #4a4a4a;
          --secondary-button-text: #ecf0f1;
          --secondary-button-hover-bg: #606060;

          --bg-color: #2c2c2c; /* Dark background */
          --card-bg-color: #3a3a3a;
          --border-color: #444444;
          --text-color: #ecf0f1;
          --secondary-text-color: #bdc3c7;
          --input-bg-color: #424242;
          --input-border-color: #555555;
          --input-focus-border: var(--primary-color);
          --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
          --card-hover-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);

          --status-success-bg: #28a745;
          --status-success-text: #ffffff;
          --status-error-bg: #dc3545;
          --status-error-text: #ffffff;

          --primary-color-rgb: 93, 173, 226; /* For dark theme */
        }

        /* Global Styles */
        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: var(--font-family);
          background-color: var(--bg-color);
          color: var(--text-color);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .settings-container {
          max-width: 900px; /* Slightly wider for more content */
          margin: 40px auto; /* More vertical margin */
          padding: 30px;
          background-color: var(--bg-color);
          border-radius: 15px; /* More rounded container */
        }

        .settings-header {
          text-align: center;
          margin-bottom: 40px; /* More spacing */
        }

        .settings-header h2 {
          font-size: 2.5em; /* Larger heading */
          color: var(--text-color);
          margin-bottom: 10px;
          font-weight: 600;
        }

        .settings-header p {
          font-size: 1.15em;
          color: var(--secondary-text-color);
          line-height: 1.6;
        }

        .settings-card {
          background: var(--card-bg-color);
          padding: 25px 30px; /* Slightly more padding */
          margin-bottom: 25px; /* More spacing between cards */
          border-radius: 15px; /* Consistent with container */
          box-shadow: var(--box-shadow);
          transition: transform 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
        }

        .settings-card:hover {
          transform: translateY(-5px); /* Lift the card slightly */
          box-shadow: var(--card-hover-shadow);
        }

        .settings-card h3 {
          display: flex; /* For icon alignment */
          align-items: center;
          margin-bottom: 15px; /* More space below heading */
          color: var(--primary-color);
          font-size: 1.6em; /* Larger card heading */
          font-weight: 500;
        }

        .settings-card h3 .icon-left {
          margin-right: 10px;
          color: var(--primary-color); /* Icon color */
        }

        .settings-card p {
          color: var(--secondary-text-color);
          margin-bottom: 20px; /* More space below paragraph */
          line-height: 1.5;
        }

        /* Input Group for Profile */
        .settings-profile-inputs .input-group {
          margin-bottom: 15px;
        }

        .settings-profile-inputs .input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-color);
        }

        .settings-input,
        .settings-select {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid var(--input-border-color);
          border-radius: 8px;
          background-color: var(--input-bg-color);
          color: var(--text-color);
          font-size: 1em;
          transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
          -webkit-appearance: none; /* Remove default select arrow */
          -moz-appearance: none;
          appearance: none;
        }

        .settings-input:focus,
        .settings-select:focus {
          outline: none;
          border-color: var(--input-focus-border);
          box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.2); /* Soft focus ring */
        }

        /* For dropdown arrow */
        .settings-option select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 15px center;
          background-size: 16px;
        }

        .settings-actions {
          display: flex;
          flex-wrap: wrap; /* Allow wrapping on smaller screens */
          gap: 15px; /* More space between buttons */
          margin-top: 20px; /* Space above actions */
        }

        .settings-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 15px 0; /* More spacing */
          font-size: 1.05em;
          color: var(--text-color);
          padding: 5px 0; /* Add a bit of padding for visual spacing */
          border-bottom: 1px solid var(--border-color); /* Subtle separator */
        }

        .settings-option:last-of-type {
          border-bottom: none; /* No border on the last option */
        }


        /* Toggle Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 50px; /* Slightly wider */
          height: 28px; /* Slightly taller */
        }

        .switch input {
          opacity: 0; /* Hide default checkbox */
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
          border-radius: 28px; /* Match height for perfect roundness */
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px; /* Slightly smaller than slider height */
          width: 20px; /* Slightly smaller than slider width */
          left: 4px; /* Offset from left */
          bottom: 4px; /* Offset from bottom */
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--success-color);
        }

        input:focus + .slider {
          box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.2); /* Focus effect for accessibility */
        }

        input:checked + .slider:before {
          transform: translateX(22px); /* Move slider dot */
        }


        /* Buttons */
        .btn {
          padding: 10px 20px; /* More padding */
          border: none;
          cursor: pointer;
          border-radius: 8px; /* More rounded buttons */
          font-size: 1em; /* Slightly larger font */
          font-weight: 500;
          transition: all 0.3s ease;
          display: inline-flex; /* For icon alignment */
          align-items: center;
          justify-content: center;
          gap: 8px; /* Space between icon and text */
        }

        .btn.primary {
          background-color: var(--primary-color);
          color: white;
        }

        .btn.primary:hover {
          background-color: var(--primary-hover-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .btn.danger {
          background-color: var(--danger-color);
          color: white;
        }

        .btn.danger:hover {
          background-color: var(--danger-hover-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .btn.secondary {
          background-color: var(--secondary-button-color);
          color: var(--secondary-button-text);
          border: 1px solid var(--border-color);
        }

        .btn.secondary:hover {
          background-color: var(--secondary-button-hover-bg);
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }


        .btn.save {
          background-color: var(--success-color);
          color: white;
          width: 100%;
          font-size: 1.1em;
          padding: 12px 20px;
        }

        .btn.save:hover {
          background-color: var(--success-hover-color);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
        }

        .btn.save:disabled {
          background-color: #a0a0a0;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .settings-footer {
          margin-top: 30px; /* More space above footer */
          text-align: center;
        }

        /* Loading Spinner */
        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Status Messages */
        .status-message {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          margin-bottom: 25px;
          border-radius: 10px;
          font-weight: 500;
          font-size: 0.95em;
          gap: 10px;
        }

        .status-message.success {
          background-color: var(--status-success-bg);
          color: var(--status-success-text);
          border: 1px solid #c3e6cb; /* Adjusted border color for success */
        }

        .status-message.error {
          background-color: var(--status-error-bg);
          color: var(--status-error-text);
          border: 1px solid #f5c6cb; /* Adjusted border color for error */
        }


        /* Confirmation Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6); /* Darker overlay */
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          opacity: 0;
          animation: fadeIn 0.3s forwards;
        }

        .modal-content {
          background-color: var(--card-bg-color);
          padding: 30px;
          border-radius: 15px;
          box-shadow: var(--box-shadow);
          max-width: 450px;
          width: 90%;
          text-align: center;
          position: relative;
          transform: scale(0.9);
          animation: slideIn 0.3s forwards;
        }

        .modal-content h3 {
          color: var(--text-color);
          font-size: 1.8em;
          margin-bottom: 15px;
        }

        .modal-content p {
          color: var(--secondary-text-color);
          margin-bottom: 30px;
          line-height: 1.6;
        }

        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .modal-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--secondary-text-color);
          transition: color 0.2s ease;
        }

        .modal-close-btn:hover {
          color: var(--danger-color);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
          .settings-container {
            padding: 20px;
            margin: 20px auto;
          }

          .settings-header h2 {
            font-size: 2em;
          }

          .settings-card {
            padding: 20px 20px;
          }

          .settings-actions {
            flex-direction: column; /* Stack buttons on small screens */
          }

          .btn {
            width: 100%; /* Full width buttons */
          }

          .settings-option {
            flex-direction: column; /* Stack label and toggle on small screens */
            align-items: flex-start;
          }

          .settings-option label:first-child {
            margin-bottom: 8px; /* Space between label and toggle */
          }

          .modal-content {
            width: 95%;
          }
        }

        @media (max-width: 480px) {
          .settings-container {
            padding: 15px;
          }

          .settings-header h2 {
            font-size: 1.8em;
          }

          .settings-card h3 {
            font-size: 1.4em;
          }
        }
      `}</style>

      <div className="settings-header">
        <h2>App Settings</h2>
        <p>Manage your preferences, account, and notifications.</p>
      </div>

      {statusMessage.message && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.message}</span>
        </div>
      )}

      {/* Account Section */}
      <div className="settings-card">
        <h3><User size={20} className="icon-left" /> Account</h3>
        <p>Manage your account details and security settings.</p>
        <div className="settings-profile-inputs">
          <div className="input-group">
            <label htmlFor="profileName">Name</label>
            <input
              type="text"
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="settings-input"
            />
          </div>
          <div className="input-group">
            <label htmlFor="profileEmail">Email</label>
            <input
              type="email"
              id="profileEmail"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="settings-input"
            />
          </div>
          <div className="input-group">
            <label htmlFor="profilePhone">Phone</label>
            <input
              type="tel"
              id="profilePhone"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className="settings-input"
            />
          </div>
        </div>
        <div className="settings-actions">
          <button className="btn primary"><Key size={16} className="icon-left" />Change Password</button>
          <button className="btn danger" onClick={() => openConfirmModal('deleteAccount')}>
            <Trash2 size={16} className="icon-left" />Delete Account
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="settings-card">
        <h3><Palette size={20} className="icon-left" /> Preferences</h3>
        <p>Customize the way you use the app.</p>
        <div className="settings-option">
          <label htmlFor="darkModeToggle">Dark Mode</label>
          <label className="switch">
            <input
              type="checkbox"
              id="darkModeToggle"
              checked={isDarkMode}
              onChange={() => setIsDarkMode(!isDarkMode)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="settings-option">
          <label htmlFor="autoSaveToggle">Enable Auto Save</label>
          <label className="switch">
            <input
              type="checkbox"
              id="autoSaveToggle"
              checked={enableAutoSave}
              onChange={() => setEnableAutoSave(!enableAutoSave)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="settings-option">
          <label htmlFor="languageSelect">Language</label>
          <select
            id="languageSelect"
            className="settings-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
        <div className="settings-option">
          <label htmlFor="timeZoneSelect">Time Zone</label>
          <select
            id="timeZoneSelect"
            className="settings-select"
            value={selectedTimeZone}
            onChange={(e) => setSelectedTimeZone(e.target.value)}
          >
            <option value="UTC">(UTC) Coordinated Universal Time</option>
            <option value="IST">(IST) India Standard Time</option>
            <option value="EST">(EST) Eastern Standard Time</option>
            <option value="PST">(PST) Pacific Standard Time</option>
          </select>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="settings-card">
        <h3><Bell size={20} className="icon-left" /> Notifications</h3>
        <p>Control how and when you receive notifications.</p>
        <div className="settings-option">
          <label htmlFor="emailNotifToggle">Email Notifications</label>
          <label className="switch">
            <input
              type="checkbox"
              id="emailNotifToggle"
              checked={emailNotifications}
              onChange={() => setEmailNotifications(!emailNotifications)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="settings-option">
          <label htmlFor="smsAlertsToggle">SMS Alerts</label>
          <label className="switch">
            <input
              type="checkbox"
              id="smsAlertsToggle"
              checked={smsAlerts}
              onChange={() => setSmsAlerts(!smsAlerts)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="settings-card">
        <h3><Lock size={20} className="icon-left" /> Privacy & Security</h3>
        <p>Manage your data privacy and session control.</p>
        <div className="settings-option">
          <label htmlFor="dataSharingToggle">Allow Data Sharing</label>
          <label className="switch">
            <input
              type="checkbox"
              id="dataSharingToggle"
              checked={allowDataSharing}
              onChange={() => setAllowDataSharing(!allowDataSharing)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <div className="settings-actions">
          <button className="btn secondary"><Download size={16} className="icon-left" />Export My Data</button>
          <button className="btn secondary" onClick={() => openConfirmModal('logoutAllDevices')}>
            <LogOut size={16} className="icon-left" />Log Out All Devices
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn save" onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader size={18} className="spinner" /> Saving...
            </>
          ) : (
            <>
              <Save size={18} className="icon-left" /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Action</h3>
            <p>
              {modalAction === 'deleteAccount'
                ? 'Are you sure you want to delete your account? This action cannot be undone.'
                : 'Are you sure you want to log out of all active sessions on other devices?'}
            </p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className={`btn ${modalAction === 'deleteAccount' ? 'danger' : 'primary'}`} onClick={handleModalConfirm}>
                {modalAction === 'deleteAccount' ? 'Delete' : 'Confirm'}
              </button>
            </div>
            <button className="modal-close-btn" onClick={() => setShowConfirmModal(false)}><X size={24} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
