import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import API from "../services/api";
import "../styles/profile.css";

function Profile() {
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    skills: [],
    bio: "",
  });

  const [skillsInput, setSkillsInput] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({});
  const [isCurrentValid, setIsCurrentValid] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ================= AUTO CLEAR SUCCESS ================= */
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("user"));

    const fetchProfile = async () => {
      try {
        const res = await API.get("/users/profile");
        const data = res.data;

        const skillsArray = Array.isArray(data.skills) ? data.skills : [];

        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          skills: skillsArray,
          bio: data.bio || "",
        });

        setSkillsInput(skillsArray.join(", "));

        // ✅ Save ALL profile fields to localStorage, not just name + email
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...localUser,
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            skills: skillsArray,
            bio: data.bio || "",
          })
        );
      } catch (err) {
        setError("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  /* ================= HANDLE INPUT ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "skills") {
      setSkillsInput(value);
      return;
    }

    setForm({ ...form, [name]: value });
  };

  /* ================= SAVE PROFILE ================= */
  const saveChanges = async () => {
    try {
      setError("");
      setSuccess("");

      if (phoneError) {
        setError("Please fix phone number before saving");
        return;
      }

      // Parse the skills string into an array
      const updatedSkills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");

      const updatedForm = {
        ...form,
        skills: updatedSkills,
      };

      const res = await API.put("/users/profile", updatedForm);

      setSuccess(res.data.message || "Profile updated successfully");
      setEditMode(false);

      // Update form state with parsed skills so UI stays in sync
      setForm((prev) => ({ ...prev, skills: updatedSkills }));

      const existingUser = JSON.parse(localStorage.getItem("user"));

      // ✅ Save ALL profile fields to localStorage, not just name + email
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...existingUser,
          name: form.name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          skills: updatedSkills, // use the parsed array, not form.skills (stale)
          bio: form.bio,
        })
      );
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  /* ================= PASSWORD ================= */
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...passwordForm, [name]: value };
    setPasswordForm(updatedForm);

    let errors = {};

    if (
      updatedForm.confirmPassword &&
      updatedForm.newPassword !== updatedForm.confirmPassword
    ) {
      errors.confirmPassword = "Passwords do not match";
    }

    setPasswordErrors(errors);
  };

  const verifyCurrentPassword = async () => {
    if (!passwordForm.currentPassword) {
      setIsCurrentValid(false);
      return;
    }

    try {
      await API.post("/users/verify-password", {
        currentPassword: passwordForm.currentPassword,
      });

      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: "",
      }));

      setIsCurrentValid(true);
    } catch {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: "Current password is incorrect",
      }));

      setIsCurrentValid(false);
    }
  };

  const changePassword = async () => {
    setError("");
    setSuccess("");

    if (!isCurrentValid) {
      setError("Please enter correct current password");
      return;
    }

    if (passwordErrors.confirmPassword) return;

    try {
      const res = await API.put("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setSuccess(res.data.message);

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordErrors({});
      setIsCurrentValid(false);
    } catch (err) {
      setError(err.response?.data?.message || "Password change failed");
    }
  };

  return (
    <Layout>
      <div className="profile-container">
        <h1>My Profile</h1>
        <p className="subtitle">
          Manage your account information and settings
        </p>

        <div className="tabs">
          <button
            className={activeTab === "profile" ? "active-tab" : ""}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            className={activeTab === "password" ? "active-tab" : ""}
            onClick={() => setActiveTab("password")}
          >
            Password
          </button>
        </div>

        {/* ================= PROFILE TAB ================= */}
        {activeTab === "profile" && (
          <div className="profile-box">
            <h3>Personal Information</h3>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  readOnly={!editMode}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input name="email" value={form.email} readOnly />
              </div>

              <div className="form-group">
                <label>Phone</label>

                <PhoneInput
                  country={"in"}
                  value={form.phone}
                  onChange={(value, data) => {
                    setForm({ ...form, phone: value });

                    const numberPart = value.slice(data.dialCode.length);

                    if (numberPart.length !== 10) {
                      setPhoneError("Phone number must be exactly 10 digits");
                    } else {
                      setPhoneError("");
                    }
                  }}
                  disabled={!editMode}
                  inputClass="phone-input"
                  containerClass="phone-container"
                />

                {phoneError && (
                  <p className="field-error">{phoneError}</p>
                )}
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  name="location"
                  value={form.location}
                  readOnly={!editMode}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Skills (comma separated)</label>
                <input
                  name="skills"
                  value={skillsInput}
                  readOnly={!editMode}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={form.bio}
                  readOnly={!editMode}
                  onChange={handleChange}
                />
              </div>
            </div>

            {!editMode ? (
              <button
                className="primary-btn"
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </button>
            ) : (
              <button
                className="primary-btn"
                onClick={saveChanges}
              >
                Save Changes
              </button>
            )}
          </div>
        )}

        {/* ================= PASSWORD TAB ================= */}
        {activeTab === "password" && (
          <div className="profile-box">
            <h3>Change Password</h3>

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <label>Current Password</label>
            <div className="password-field">
              <input
                type={showCurrent ? "text" : "password"}
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                onBlur={verifyCurrentPassword}
              />
              <span onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <FaEye /> : <FaEyeSlash />}
              </span>
            </div>
            {passwordErrors.currentPassword && (
              <p className="field-error">
                {passwordErrors.currentPassword}
              </p>
            )}

            <label>New Password</label>
            <div className="password-field">
              <input
                type={showNew ? "text" : "password"}
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                disabled={!isCurrentValid}
              />
              <span onClick={() => setShowNew(!showNew)}>
                {showNew ? <FaEye /> : <FaEyeSlash />}
              </span>
            </div>

            <label>Confirm New Password</label>
            <div className="password-field">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                disabled={!isCurrentValid}
              />
              <span onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <FaEye /> : <FaEyeSlash />}
              </span>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="field-error">
                {passwordErrors.confirmPassword}
              </p>
            )}

            <button
              className="primary-btn"
              onClick={changePassword}
              disabled={!isCurrentValid || passwordErrors.confirmPassword}
            >
              Change Password
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Profile;