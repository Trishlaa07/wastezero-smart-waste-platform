import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Bell, Lock, Shield, User, Globe, Moon, LogOut, CheckCircle } from "lucide-react";
import "../styles/settingsSupport.css";

const Settings = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user")) || { name: "User", role: "volunteer" };
  const isNGO = user.role === "ngo";
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : {
      emailNotifications: true,
      smsNotifications: false,
      profileVisibility: true,
      darkMode: document.documentElement.getAttribute("data-theme") === "dark",
      autoMatch: true,
      autoExpiry: false
    };
  });

  const [toast, setToast] = useState("");

  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    // Apply theme
    if (settings.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, [settings]);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setToast(`Updated ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    setTimeout(() => setToast(""), 2000);
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const SettingToggle = ({ title, description, settingKey }) => (
    <div className="setting-item">
      <div className="setting-info">
        <span className="setting-title">{title}</span>
        <span className="setting-desc">{description}</span>
      </div>
      <label className="switch">
        <input 
          type="checkbox" 
          checked={settings[settingKey]} 
          onChange={() => handleToggle(settingKey)} 
        />
        <span className="slider"></span>
      </label>
    </div>
  );

  return (
    <Layout>
      <div className={isNGO ? "ngo-container" : "vol-container"}>
        <div className={isNGO ? "ngo-header" : "vol-header"}>
          <div>
            <h2 className={isNGO ? "ngo-dashboard-title" : "dashboard-title"}>Settings</h2>
            <p className={isNGO ? "ngo-welcome" : "dashboard-welcome"}>
              Manage your {isNGO ? "NGO" : "account"} preferences and platform settings
            </p>
          </div>
        </div>

        {toast && (
          <div className="setting-toast">
            <CheckCircle size={14} /> {toast}
          </div>
        )}

        <div className="settings-grid">
          {/* Notifications */}
          <div className="settings-card">
            <h3><Bell size={18} /> Notifications</h3>
            <SettingToggle 
              title="Email Notifications" 
              description={isNGO ? "Alerts for new volunteer applications" : "Receive updates about your applications"} 
              settingKey="emailNotifications" 
            />
            <SettingToggle 
              title="SMS Alerts" 
              description="Get text messages for urgent platform active" 
              settingKey="smsNotifications" 
            />
          </div>

          {/* Role Specific Settings */}
          {isNGO ? (
            <div className="settings-card">
              <h3><Globe size={18} /> Opportunity Management</h3>
              <SettingToggle 
                title="Auto-Expiry" 
                description="Automatically close opportunities after 30 days" 
                settingKey="autoExpiry" 
              />
              <div className="setting-item" style={{ cursor: "pointer" }} onClick={() => navigate("/opportunities")}>
                <div className="setting-info">
                  <span className="setting-title">Default Opportunity Location</span>
                  <span className="setting-desc">Set a default location for new posts</span>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            </div>
          ) : (
            <div className="settings-card">
              <h3><Globe size={18} /> Volunteer Preferences</h3>
              <SettingToggle 
                title="Auto-Match" 
                description="Suggest new opportunities based on your skills" 
                settingKey="autoMatch" 
              />
              <div className="setting-item" style={{ cursor: "pointer" }} onClick={() => navigate("/impact")}>
                <div className="setting-info">
                  <span className="setting-title">Public Impact Stats</span>
                  <span className="setting-desc">Configure who can see your waste stats</span>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            </div>
          )}

          {/* Privacy & Security */}
          <div className="settings-card">
            <h3><Shield size={18} /> Privacy & Security</h3>
            <SettingToggle 
              title="Public Visibility" 
              description={isNGO ? "Make your NGO profile discoverable" : "Allow NGOs to see your full bio"} 
              settingKey="profileVisibility" 
            />
            <div 
              className="setting-item" 
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/profile")}
            >
              <div className="setting-info">
                <span className="setting-title">Change Password</span>
                <span className="setting-desc">Update your login security</span>
              </div>
              <Lock size={16} color="#9ca3af" />
            </div>
          </div>

          {/* Account */}
          <div className="settings-card">
            <h3><User size={18} /> Account details</h3>
            <SettingToggle 
              title="Dark Mode theme" 
              description="Enable a darker interface for better eye comfort" 
              settingKey="darkMode" 
            />
            <div 
              className="setting-item" 
              style={{ color: "#dc2626", cursor: "pointer", borderTop: "1px solid #fee2e2", marginTop: "10px", paddingTop: "15px" }}
              onClick={handleSignOut}
            >
              <div className="setting-info">
                <span className="setting-title" style={{ color: "#dc2626" }}>Log Out</span>
                <span className="setting-desc">Safely sign out of your account</span>
              </div>
              <LogOut size={16} color="#dc2626" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Add ChevronRight to lucide-react imports if not there
import { ChevronRight } from "lucide-react";

export default Settings;
