import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import {
  Bell, Lock, Shield, User, Globe,
  CheckCircle, ChevronRight, X, Users,
  BarChart2, AlertTriangle, ToggleLeft, Database,
  Sliders, Eye, Mail, Clock, Trash2, Key, MessageCircle,
} from "lucide-react";
import "../styles/settings.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const SettingToggle = ({ title, description, settingKey, settings, saving, onToggle, icon: Icon }) => (
  <div className="setting-item">
    <div className="setting-item-left">
      {Icon && <div className="setting-icon-wrap"><Icon size={15} /></div>}
      <div className="setting-info">
        <span className="setting-title">{title}</span>
        <span className="setting-desc">{description}</span>
      </div>
    </div>
    <label className="switch">
      <input
        type="checkbox"
        checked={!!settings[settingKey]}
        onChange={() => onToggle(settingKey)}
      />
      <span className={`slider ${saving === settingKey ? "slider-saving" : ""}`} />
    </label>
  </div>
);

const SettingLink = ({ title, description, onClick, icon: Icon, danger }) => (
  <div
    className={`setting-item setting-item-link ${danger ? "setting-item-danger" : ""}`}
    onClick={onClick}
  >
    <div className="setting-item-left">
      {Icon && (
        <div className={`setting-icon-wrap ${danger ? "setting-icon-danger" : ""}`}>
          <Icon size={15} />
        </div>
      )}
      <div className="setting-info">
        <span className={`setting-title ${danger ? "danger-title" : ""}`}>{title}</span>
        <span className="setting-desc">{description}</span>
      </div>
    </div>
    <ChevronRight size={16} className="chevron-icon" />
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const token    = localStorage.getItem("token");
  const user     = JSON.parse(localStorage.getItem("user")) || {};
  const role     = user.role;

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : {
      generalNotifications:  true,
      activityNotifications: true,
      chatNotifications:     true,
      profileVisibility:     true,
      autoMatch:             true,
      autoExpiry:            false,
      darkMode:              document.documentElement.getAttribute("data-theme") === "dark",
      maintenanceMode:       false,
      allowRegistrations:    true,
      emailDigest:           true,
      autoFlagReports:       true,
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

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/settings/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(res => {
      const d = res.data.data;
      setSettings(prev => ({
        ...prev,
        generalNotifications:  d.emailNotifications      ?? prev.generalNotifications,
        activityNotifications: d.activityNotifications   ?? prev.activityNotifications,
        chatNotifications:     d.chatNotifications        ?? prev.chatNotifications,
        profileVisibility:     d.profileVisibility        ?? prev.profileVisibility,
        autoMatch:             d.autoMatch                ?? prev.autoMatch,
      }));
    })
    .catch(() => {});
  }, [token]);

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
      if (key === "generalNotifications") {
        await axios.put(`${API}/api/settings/notifications`, { type: "general",  enabled: newVal }, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`General notifications ${newVal ? "enabled" : "disabled"}`);
      } else if (key === "activityNotifications") {
        await axios.put(`${API}/api/settings/notifications`, { type: "activity", enabled: newVal }, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`Activity notifications ${newVal ? "enabled" : "disabled"}`);
      } else if (key === "chatNotifications") {
        await axios.put(`${API}/api/settings/notifications`, { type: "chat",     enabled: newVal }, { headers: { Authorization: `Bearer ${token}` } });
        showToast(`Chat notifications ${newVal ? "enabled" : "disabled"}`);
      } else if (["profileVisibility","autoMatch","autoExpiry","maintenanceMode","allowRegistrations","emailDigest","autoFlagReports"].includes(key)) {
        await axios.put(`${API}/api/settings/preferences`, { [key]: newVal }, { headers: { Authorization: `Bearer ${token}` } });
        showToast("Setting updated successfully");
      } else if (key === "darkMode") {
        showToast(`Dark mode ${newVal ? "enabled" : "disabled"}`);
      }
    } catch {
      setSettings(prev => ({ ...prev, [key]: !newVal }));
      showToast("Failed to save. Please try again.", true);
    } finally {
      setSaving("");
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) { setPwError("All fields are required."); return; }
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords do not match."); return; }
    setPwLoading(true);
    try {
      await axios.put(`${API}/api/settings/change-password`, { currentPassword: pwForm.current, newPassword: pwForm.next }, { headers: { Authorization: `Bearer ${token}` } });
      setPwModal(false);
      setPwForm({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully!");
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactLoading(true);
    try {
      await axios.delete(`${API}/api/settings/account`, { headers: { Authorization: `Bearer ${token}` } });
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", { state: { deactivated: true } });
    } catch {
      showToast("Failed to deactivate. Please try again.", true);
    } finally {
      setDeactLoading(false);
      setDeactModal(false);
    }
  };

  const sharedProps = { settings, saving, onToggle: handleToggle };

  return (
    <Layout>
      <div className="settings-page">

        <div className="settings-page-header">
          <h2 className="settings-heading">Settings & Preferences</h2>
          <p className="settings-subheading">
            {role === "admin"
              ? "Control platform behaviour, manage users, and configure system settings"
              : role === "ngo"
              ? "Manage your organisation's preferences, opportunities, and notifications"
              : "Personalise your volunteer experience and account security"}
          </p>
        </div>

        {toast.show && (
          <div className={`setting-toast ${toast.error ? "setting-toast-error" : ""}`}>
            <CheckCircle size={14} /> {toast.message}
          </div>
        )}

        {/* ── VOLUNTEER ── */}
        {role === "volunteer" && (
          <div className="settings-grid">

            <div className="settings-card">
              <div className="settings-card-header"><Bell size={17} /><h3>Notifications</h3></div>
              <SettingToggle title="General Notifications"  description="System alerts and platform announcements"                            settingKey="generalNotifications"  icon={Bell}          {...sharedProps} />
              <SettingToggle title="Activity Notifications" description="Application updates, new opportunities, and status changes"          settingKey="activityNotifications" icon={Mail}          {...sharedProps} />
              <SettingToggle title="Chat Notifications"     description="New message alerts from NGOs"                                        settingKey="chatNotifications"     icon={MessageCircle} {...sharedProps} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Globe size={17} /><h3>Volunteer Preferences</h3></div>
              <SettingToggle title="Auto-Match" description="Show opportunities ranked by your skill match. Off = show all" settingKey="autoMatch" icon={Sliders} {...sharedProps} />
              <SettingLink   title="Browse Opportunities" description="Explore opportunities that match your skills" onClick={() => navigate("/opportunities")} icon={Globe} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Shield size={17} /><h3>Privacy & Security</h3></div>
              <SettingToggle title="Public Profile" description="Allow NGOs to see your skills and bio when reviewing your application" settingKey="profileVisibility" icon={Eye} {...sharedProps} />
              <SettingLink   title="Change Password" description="Update your login credentials" onClick={() => { setPwModal(true); setPwError(""); }} icon={Key} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><User size={17} /><h3>Account</h3></div>
              <SettingToggle title="Dark Mode" description="Enable a darker interface for better eye comfort" settingKey="darkMode" icon={ToggleLeft} {...sharedProps} />
              <SettingLink   title="Deactivate Account" description="Disable your account. Log in again anytime to reactivate" onClick={() => setDeactModal(true)} icon={Trash2} danger />
            </div>

          </div>
        )}

        {/* ── NGO ── */}
        {role === "ngo" && (
          <div className="settings-grid">

            <div className="settings-card">
              <div className="settings-card-header"><Bell size={17} /><h3>Notifications</h3></div>
              <SettingToggle title="General Notifications"  description="System alerts and platform announcements"              settingKey="generalNotifications"  icon={Bell}          {...sharedProps} />
              <SettingToggle title="Activity Notifications" description="New applications, opportunity updates, and status changes" settingKey="activityNotifications" icon={Mail}          {...sharedProps} />
              <SettingToggle title="Chat Notifications"     description="New message alerts from volunteers"                     settingKey="chatNotifications"     icon={MessageCircle} {...sharedProps} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Globe size={17} /><h3>Opportunity Management</h3></div>
              <SettingToggle title="Auto-Expiry"         description="Automatically close opportunities 30 days after posting"  settingKey="autoExpiry" icon={Clock}  {...sharedProps} />
              <SettingLink   title="Manage Opportunities" description="View, edit, and track your posted opportunities"          onClick={() => navigate("/opportunities")} icon={Globe} />
              <SettingLink   title="View Applications"    description="Review and manage volunteer applications"                 onClick={() => navigate("/applications")}  icon={Users} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Shield size={17} /><h3>Privacy & Security</h3></div>
              <SettingToggle title="Public NGO Profile" description="Make your organisation discoverable to volunteers" settingKey="profileVisibility" icon={Eye} {...sharedProps} />
              <SettingLink   title="Change Password"    description="Update your organisation's login credentials"     onClick={() => { setPwModal(true); setPwError(""); }} icon={Key} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><User size={17} /><h3>Account</h3></div>
              <SettingToggle title="Dark Mode"          description="Enable a darker interface for better eye comfort"  settingKey="darkMode" icon={ToggleLeft} {...sharedProps} />
              <SettingLink   title="Edit NGO Profile"   description="Update your organisation's details and branding"   onClick={() => navigate("/profile")} icon={User} />
              <SettingLink   title="Deactivate Account" description="Disable your account. Log in again anytime to reactivate" onClick={() => setDeactModal(true)} icon={Trash2} danger />
            </div>

          </div>
        )}

        {/* ── ADMIN ── */}
        {role === "admin" && (
          <div className="settings-grid settings-grid-admin">

            <div className="settings-card card-wide">
              <div className="settings-card-header"><Database size={17} /><h3>Platform Controls</h3><span className="admin-badge">System</span></div>
              <SettingToggle title="Maintenance Mode"    description="Put the platform in read-only mode for all non-admin users"    settingKey="maintenanceMode"    icon={AlertTriangle} {...sharedProps} />
              <SettingToggle title="Allow Registrations" description="Enable or disable new user sign-ups platform-wide"             settingKey="allowRegistrations" icon={Users}         {...sharedProps} />
              <SettingToggle title="Auto-Flag Reports"   description="Automatically flag content that receives 3+ user reports"      settingKey="autoFlagReports"    icon={Shield}        {...sharedProps} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Users size={17} /><h3>User Management</h3><span className="admin-badge">Admin</span></div>
              <SettingLink title="Manage Volunteers" description="View, verify, suspend, or remove volunteer accounts" onClick={() => navigate("/admin/users?role=volunteer")} icon={User} />
              <SettingLink title="Manage NGOs"       description="Review NGO registrations and manage their status"   onClick={() => navigate("/admin/users?role=ngo")}       icon={Globe} />
              <SettingLink title="Pending Approvals" description="NGOs and volunteers awaiting verification"           onClick={() => navigate("/admin/approvals")}            icon={CheckCircle} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><BarChart2 size={17} /><h3>Platform Analytics</h3><span className="admin-badge">Admin</span></div>
              <SettingLink title="Activity Reports"     description="View platform usage, signups, and engagement stats"    onClick={() => navigate("/admin/analytics")}     icon={BarChart2} />
              <SettingLink title="Opportunity Overview" description="Monitor all active, closed, and flagged opportunities" onClick={() => navigate("/admin/opportunities")} icon={Globe} />
            </div>

            {/* Admin: general notifications only */}
            <div className="settings-card">
              <div className="settings-card-header"><Bell size={17} /><h3>Notifications</h3></div>
              <SettingToggle title="General Notifications" description="Receive system alerts, user reports, and activity digests" settingKey="generalNotifications" icon={Bell} {...sharedProps} />
            </div>

            <div className="settings-card">
              <div className="settings-card-header"><Lock size={17} /><h3>Admin Security</h3></div>
              <SettingToggle title="Dark Mode"       description="Toggle interface theme for your admin panel" settingKey="darkMode" icon={ToggleLeft} {...sharedProps} />
              <SettingLink   title="Change Password" description="Update your admin account password"          onClick={() => { setPwModal(true); setPwError(""); }} icon={Key} />
            </div>

          </div>
        )}

      </div>

      {/* ── Change Password Modal ── */}
      {pwModal && (
        <div className="settings-modal-overlay" onClick={() => setPwModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3>Change Password</h3>
              <button className="settings-modal-close" onClick={() => setPwModal(false)}><X size={18} /></button>
            </div>
            <div className="settings-modal-body">
              {pwError && <div className="settings-modal-error">⚠ {pwError}</div>}
              <div className="settings-modal-field"><label>Current Password</label><input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" /></div>
              <div className="settings-modal-field"><label>New Password</label><input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} placeholder="At least 6 characters" /></div>
              <div className="settings-modal-field"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" /></div>
            </div>
            <div className="settings-modal-footer">
              <button className="settings-cancel-btn" onClick={() => setPwModal(false)}>Cancel</button>
              <button className="settings-save-btn" onClick={handleChangePassword} disabled={pwLoading}>{pwLoading ? "Saving…" : "Save Password"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Modal ── */}
      {deactModal && (
        <div className="settings-modal-overlay" onClick={() => setDeactModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 className="deact-title">Deactivate Account</h3>
              <button className="settings-modal-close" onClick={() => setDeactModal(false)}><X size={18} /></button>
            </div>
            <div className="settings-modal-body">
              <div className="deact-warning-box">
                <AlertTriangle size={18} />
                <div>
                  <strong>Are you sure?</strong>
                  <p>Your account will be disabled and you'll be logged out. Simply log in again anytime to reactivate.</p>
                </div>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="settings-cancel-btn" onClick={() => setDeactModal(false)}>Cancel</button>
              <button className="settings-deact-btn" onClick={handleDeactivate} disabled={deactLoading}>{deactLoading ? "Deactivating…" : "Yes, Deactivate"}</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default Settings;