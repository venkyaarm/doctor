import "./Settings.css";

export default function Settings() {
  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>App Settings</h2>
        <p>Manage your preferences, account, and notifications.</p>
      </div>

      {/* Account Section */}
      <div className="settings-card">
        <h3>Account</h3>
        <p>Manage your account details and security settings.</p>
        <div className="settings-actions">
          <button className="btn primary">Edit Profile</button>
          <button className="btn danger">Delete Account</button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="settings-card">
        <h3>Preferences</h3>
        <p>Customize the way you use the app.</p>
        <div className="settings-option">
          <label>Dark Mode</label>
          <label className="switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
        <div className="settings-option">
          <label>Enable Auto Save</label>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="settings-card">
        <h3>Notifications</h3>
        <p>Control how and when you receive notifications.</p>
        <div className="settings-option">
          <label>Email Notifications</label>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
        <div className="settings-option">
          <label>SMS Alerts</label>
          <label className="switch">
            <input type="checkbox" />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-footer">
        <button className="btn save">Save Changes</button>
      </div>
    </div>
  );
}
