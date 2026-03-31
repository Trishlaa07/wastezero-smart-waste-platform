import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import {
  Bell, Lock, Shield, User, Globe,
  CheckCircle, ChevronRight, X,
} from "lucide-react";
import "../styles/settingsSupport.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const Settings = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const user     = JSON.parse(localStorage.getItem("user")) || {};
  const isNGO    = user.role === "ngo";

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : {
      emailNotifications: true,
      profileVisibility:  true,
      darkMode:           document.documentElement.getAttribute("data-theme") === "dark",
      autoMatch:          true,
      autoExpiry:         false,
    };
  });

  const [toast,        setToast]        = useState({ show: false, message: "", error: false });
  const [pwModal,      setPwModal]      = useState(false);
  const [deactModal,   setDeactModal]   = useState(false);
  const [pwForm,       setPwForm]       = useState({ current: "", next: "", confirm: "" });
  const [pwError,      setPwError]      = useState("");
  const [pwLoading,    setPwLoading]    = useState(false);
  const [deactLoading, setDeactLoading] = useState(false);
  const [saving,       setSaving]       = useState("");

  // ── Load preferences from backend ──
  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/settings/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(res => {
      const prefs = res.data.data;
      setSettings(prev => ({
        ...prev,
        emailNotifications: prefs.emailNotifications ?? prev.emailNotifications,
        autoMatch:          prefs.autoMatch          ?? prev.autoMatch,
        autoExpiry:         prefs.autoExpiry         ?? prev.autoExpiry,
      }));
    })
    .catch(() => {});
  }, [token]);

  // ── Persist locally + apply theme ──
  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(settings));
    document.documentElement.setAttribute("data-theme", settings.darkMode ? "dark" : "light");
  }, [settings]);

  const showToast = (message, error = false) => {
    setToast({ show: true, message, error });
    setTimeout(() => setToast({ show: false, message: "", error: false }), 3500);
  };

  const handleToggle = async (key) => {
    const newVal = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newVal }));
    setSaving(key);

    try {
      if (key === "emailNotifications") {
        await axios.put(
          `${API}/api/settings/notifications`,
          { email: newVal },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast(
          newVal
            ? "Email notifications enabled — check your inbox for a confirmation"
            : "Email notifications disabled"
        );
      } else if (key === "autoMatch" || key === "autoExpiry") {
        await axios.put(
          `${API}/api/settings/preferences`,
          { [key]: newVal },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (key === "autoMatch") {
          showToast(
            newVal
              ? "Auto-match enabled — opportunities will be sorted by skill match"
              : "Auto-match disabled — showing all opportunities"
          );
        } else {
          showToast(
            newVal
              ? "Auto-expiry enabled — opportunities close after 30 days"
              : "Auto-expiry disabled"
          );
        }
      } else if (key === "darkMode") {
        showToast(`Dark mode ${newVal ? "enabled" : "disabled"}`);
      } else {
        showToast("Setting updated");
      }
    } catch {
      setSettings(prev => ({ ...prev, [key]: !newVal }));
      showToast("Failed to save. Please try again.", true);
    } finally {
      setSaving("");
    }
  };

  // ── Change password ──
  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("All fields are required."); return;
    }
    if (pwForm.next.length < 6) {
      setPwError("New password must be at least 6 characters."); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords do not match."); return;
    }
    setPwLoading(true);
    try {
      await axios.put(
        `${API}/api/settings/change-password`,
        { currentPassword: pwForm.current, newPassword: pwForm.next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPwModal(false);
      setPwForm({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully!");
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Deactivate ──
  const handleDeactivate = async () => {
    setDeactLoading(true);
    try {
      await axios.delete(`${API}/api/settings/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Send reactivation instructions email via backend
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", {
        state: { deactivated: true },
      });
    } catch {
      showToast("Failed to deactivate. Please try again.", true);
    } finally {
      setDeactLoading(false);
      setDeactModal(false);
    }
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
        <span className={`slider ${saving === settingKey ? "slider-saving" : ""}`} />
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

        {toast.show && (
          <div className={`setting-toast ${toast.error ? "setting-toast-error" : ""}`}>
            <CheckCircle size={14} /> {toast.message}
          </div>
        )}

        <div className="settings-grid">

          {/* ── Notifications ── */}
          <div className="settings-card">
            <h3><Bell size={18} /> Notifications</h3>
            <SettingToggle
              title="Email Notifications"
              description={
                isNGO
                  ? "Receive emails for new applications and opportunity updates"
                  : "Get emails for application status, pickups, and new matches"
              }
              settingKey="emailNotifications"
            />
          </div>

          {/* ── Role-specific ── */}
          {isNGO ? (
            <div className="settings-card">
              <h3><Globe size={18} /> Opportunity Management</h3>
              <SettingToggle
                title="Auto-Expiry"
                description="Automatically close your opportunities 30 days after posting"
                settingKey="autoExpiry"
              />
              <div
                className="setting-item"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/opportunities")}
              >
                <div className="setting-info">
                  <span className="setting-title">Manage Opportunities</span>
                  <span className="setting-desc">View and edit your posted opportunities</span>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </div>
            </div>
          ) : (
            <div className="settings-card">
              <h3><Globe size={18} /> Volunteer Preferences</h3>
              <SettingToggle
                title="Auto-Match"
                description="Sort opportunities by skill match. Turn off to see all opportunities"
                settingKey="autoMatch"
              />
            </div>
          )}

          {/* ── Privacy & Security ── */}
          <div className="settings-card">
            <h3><Shield size={18} /> Privacy & Security</h3>
            <SettingToggle
              title="Public Visibility"
              description={isNGO ? "Make your NGO profile discoverable" : "Allow NGOs to see your skills and bio"}
              settingKey="profileVisibility"
            />
            <div
              className="setting-item"
              style={{ cursor: "pointer" }}
              onClick={() => { setPwModal(true); setPwError(""); }}
            >
              <div className="setting-info">
                <span className="setting-title">Change Password</span>
                <span className="setting-desc">Update your login security</span>
              </div>
              <Lock size={16} color="#9ca3af" />
            </div>
          </div>

          {/* ── Account ── */}
          <div className="settings-card">
            <h3><User size={18} /> Account</h3>
            <SettingToggle
              title="Dark Mode"
              description="Enable a darker interface for better eye comfort"
              settingKey="darkMode"
            />
            <div
              className="setting-item"
              style={{ cursor: "pointer", borderTop: "1px solid #fef3c7", marginTop: 10, paddingTop: 15 }}
              onClick={() => setDeactModal(true)}
            >
              <div className="setting-info">
                <span className="setting-title" style={{ color: "#b45309" }}>Deactivate Account</span>
                <span className="setting-desc">Temporarily disable your account</span>
              </div>
              <Shield size={16} color="#b45309" />
            </div>
          </div>

        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {pwModal && (
        <div className="settings-modal-overlay" onClick={() => setPwModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Change Password</h3>
              <button className="settings-modal-close" onClick={() => setPwModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body">
              {pwError && <div className="settings-modal-error">⚠ {pwError}</div>}
              <div className="settings-modal-field">
                <label>Current Password</label>
                <input
                  type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="settings-modal-field">
                <label>New Password</label>
                <input
                  type="password"
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="settings-modal-field">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                />
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="settings-cancel-btn" onClick={() => setPwModal(false)}>Cancel</button>
              <button className="settings-save-btn" onClick={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? "Saving…" : "Save Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Confirmation Modal ── */}
      {deactModal && (
        <div className="settings-modal-overlay" onClick={() => setDeactModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 style={{ color: "#b45309" }}>Deactivate Account</h3>
              <button className="settings-modal-close" onClick={() => setDeactModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body">
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#92400e",
                lineHeight: 1.6,
              }}>
                <strong>Are you sure?</strong>
                <p style={{ margin: "8px 0 0" }}>
                  Your account will be disabled and you'll be logged out.
                  You can reactivate it anytime from the login page using
                  your email and password.
                </p>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="settings-cancel-btn" onClick={() => setDeactModal(false)}>
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactLoading}
                style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: "#b45309", color: "#fff", fontSize: 13,
                  fontWeight: 700, cursor: "pointer", opacity: deactLoading ? 0.6 : 1,
                }}
              >
                {deactLoading ? "Deactivating…" : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Settings;