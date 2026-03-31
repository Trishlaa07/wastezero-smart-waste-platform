import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import API from "../services/api";
import "../styles/profile.css";

function Profile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode,  setEditMode]  = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "", skills: [], bio: "",
  });

  const [skillsInput,  setSkillsInput]  = useState("");
  const [phoneError,   setPhoneError]   = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isCurrentValid, setIsCurrentValid] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  /* ── Auto-clear success ── */
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  /* ── Fetch profile ── */
  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user"));
    const fetchProfile = async () => {
      try {
        const res  = await API.get("/users/profile");
        const data = res.data;
        const skillsArray = Array.isArray(data.skills) ? data.skills : [];
        setForm({
          name:     data.name     || "",
          email:    data.email    || "",
          phone:    data.phone    || "",
          location: data.location || "",
          skills:   skillsArray,
          bio:      data.bio      || "",
        });
        setSkillsInput(skillsArray.join(", "));
        localStorage.setItem("user", JSON.stringify({
          ...localUser,
          name: data.name || "", email: data.email || "",
          phone: data.phone || "", location: data.location || "",
          skills: skillsArray, bio: data.bio || "",
        }));
      } catch {
        setError("Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  /* ── Handlers ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "skills") { setSkillsInput(value); return; }
    setForm({ ...form, [name]: value });
  };

  const saveChanges = async () => {
    try {
      setError(""); setSuccess("");
      if (phoneError) { setError("Please fix phone number before saving"); return; }
      const updatedSkills = skillsInput.split(",").map(s => s.trim()).filter(Boolean);
      const updatedForm   = { ...form, skills: updatedSkills };
      const res = await API.put("/users/profile", updatedForm);
      setSuccess(res.data.message || "Profile updated successfully");
      setEditMode(false);
      setForm(prev => ({ ...prev, skills: updatedSkills }));
      const existingUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({
        ...existingUser, name: form.name, email: form.email,
        phone: form.phone, location: form.location,
        skills: updatedSkills, bio: form.bio,
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...passwordForm, [name]: value };
    setPasswordForm(updated);
    const errors = {};
    if (updated.confirmPassword && updated.newPassword !== updated.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setPasswordErrors(errors);
  };

  const verifyCurrentPassword = async () => {
    if (!passwordForm.currentPassword) { setIsCurrentValid(false); return; }
    try {
      await API.post("/users/verify-password", { currentPassword: passwordForm.currentPassword });
      setPasswordErrors(prev => ({ ...prev, currentPassword: "" }));
      setIsCurrentValid(true);
    } catch {
      setPasswordErrors(prev => ({ ...prev, currentPassword: "Current password is incorrect" }));
      setIsCurrentValid(false);
    }
  };

  const changePassword = async () => {
    setError(""); setSuccess("");
    if (!isCurrentValid) { setError("Please enter correct current password"); return; }
    if (passwordErrors.confirmPassword) return;
    try {
      const res = await API.put("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword:     passwordForm.newPassword,
      });
      setSuccess(res.data.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      setIsCurrentValid(false);
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed");
    }
  };

  /* ── Profile completion ── */
  const profileFields = [
    { label: "Name",     done: !!form.name.trim()     },
    { label: "Bio",      done: !!form.bio.trim()      },
    { label: "Skills",   done: form.skills.length > 0 },
    { label: "Location", done: !!form.location.trim() },
    { label: "Phone",    done: !!form.phone.trim()    },
  ];
  const filled     = profileFields.filter(f => f.done).length;
  const profilePct = Math.round((filled / profileFields.length) * 100);

  return (
    <Layout>
      <div className="pf-page">

        {/* ── Header ── */}
        <div className="pf-header">
          <h1 className="pf-title">My Profile</h1>
          <p className="pf-sub">Manage your account information and settings</p>
        </div>

        {/* ── Tabs ── */}
        <div className="pf-tabs">
          <button
            className={`pf-tab${activeTab === "profile" ? " active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            className={`pf-tab${activeTab === "password" ? " active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            Password
          </button>
        </div>

        {/* ════════════════════════════
            PROFILE TAB
        ════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="pf-card">
            <div className="pf-card-header">
              <div>
                <div className="pf-card-title">Personal Information</div>
                <div className="pf-card-sub">Keep your details up to date</div>
              </div>
              {!editMode ? (
                <button className="pf-edit-btn" onClick={() => setEditMode(true)}>
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="pf-cancel-btn"
                    onClick={() => { setEditMode(false); setError(""); }}
                  >
                    Cancel
                  </button>
                  <button className="pf-save-btn" onClick={saveChanges}>
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {error   && <div className="pf-error">{error}</div>}
            {success && <div className="pf-success">{success}</div>}

            <div className="pf-form-grid">

              <div className="pf-field">
                <label className="pf-label">Full Name</label>
                <input
                  className="pf-input"
                  name="name"
                  value={form.name}
                  readOnly={!editMode}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="pf-field">
                <label className="pf-label">Email</label>
                <input
                  className="pf-input"
                  name="email"
                  value={form.email}
                  readOnly
                  placeholder="your@email.com"
                />
              </div>

              <div className="pf-field">
                <label className="pf-label">Phone</label>
                <PhoneInput
                  country={"in"}
                  value={form.phone}
                  onChange={(value, data) => {
                    setForm({ ...form, phone: value });
                    const digits = value.slice(data.dialCode.length);
                    setPhoneError(digits.length !== 10 ? "Phone number must be exactly 10 digits" : "");
                  }}
                  disabled={!editMode}
                  inputClass="pf-phone-input"
                  containerClass="pf-phone-container"
                />
                {phoneError && <p className="pf-field-error">{phoneError}</p>}
              </div>

              <div className="pf-field">
                <label className="pf-label">Location</label>
                <input
                  className="pf-input"
                  name="location"
                  value={form.location}
                  readOnly={!editMode}
                  onChange={handleChange}
                  placeholder="City, State"
                />
              </div>

              <div className="pf-field pf-full">
                <label className="pf-label">Skills <span className="pf-label-hint">(comma separated)</span></label>
                <input
                  className="pf-input"
                  name="skills"
                  value={skillsInput}
                  readOnly={!editMode}
                  onChange={handleChange}
                  placeholder="e.g. Teaching, First Aid, Driving"
                />
              </div>

              <div className="pf-field pf-full">
                <label className="pf-label">Bio</label>
                <textarea
                  className="pf-input pf-textarea"
                  name="bio"
                  value={form.bio}
                  readOnly={!editMode}
                  onChange={handleChange}
                  placeholder="Tell us a little about yourself…"
                />
              </div>

            </div>
          </div>
        )}

        {/* ════════════════════════════
            PASSWORD TAB
        ════════════════════════════ */}
        {activeTab === "password" && (
          <div className="pf-card">
            <div className="pf-card-header">
              <div>
                <div className="pf-card-title">Change Password</div>
                <div className="pf-card-sub">Keep your account secure</div>
              </div>
            </div>

            {error   && <div className="pf-error">{error}</div>}
            {success && <div className="pf-success">{success}</div>}

            <div className="pf-pw-stack">

              <div className="pf-field">
                <label className="pf-label">Current Password</label>
                <div className="pf-pw-row">
                  <input
                    className="pf-input"
                    type={showCurrent ? "text" : "password"}
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    onBlur={verifyCurrentPassword}
                    placeholder="Enter current password"
                  />
                  <button className="pf-eye-btn" onClick={() => setShowCurrent(v => !v)}>
                    {showCurrent ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="pf-field-error">{passwordErrors.currentPassword}</p>
                )}
                {isCurrentValid && (
                  <p className="pf-field-ok">✓ Password verified</p>
                )}
              </div>

              <div className="pf-field">
                <label className="pf-label">New Password</label>
                <div className="pf-pw-row">
                  <input
                    className="pf-input"
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    disabled={!isCurrentValid}
                    placeholder="Enter new password"
                  />
                  <button className="pf-eye-btn" onClick={() => setShowNew(v => !v)}>
                    {showNew ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-label">Confirm New Password</label>
                <div className="pf-pw-row">
                  <input
                    className="pf-input"
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={!isCurrentValid}
                    placeholder="Repeat new password"
                  />
                  <button className="pf-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="pf-field-error">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <div className="pf-pw-action">
                <button
                  className="pf-save-btn"
                  onClick={changePassword}
                  disabled={!isCurrentValid || !!passwordErrors.confirmPassword}
                >
                  Change Password
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}

export default Profile;