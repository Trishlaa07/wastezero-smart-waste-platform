import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Truck, BarChart2, Users } from "lucide-react";
import API from "../services/api";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PWD_RE   = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

const FEATURES = [
  { icon: <Truck size={16} />,     title: "Schedule Pickups",  desc: "Easily arrange waste collection" },
  { icon: <BarChart2 size={16} />, title: "Track Impact",      desc: "Monitor your environmental contribution" },
  { icon: <Users size={16} />,     title: "Volunteer",         desc: "Join recycling initiatives" },
];

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", location: "", password: "", confirmPassword: "", role: "volunteer",
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError,          setEmailError]          = useState("");
  const [passwordError,       setPasswordError]       = useState("");
  const [submitError,         setSubmitError]         = useState("");
  const [loading,             setLoading]             = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "email") {
      setEmailError(EMAIL_RE.test(value) ? "" : "Enter a valid email address");
    }
    if (name === "password") {
      if (!PWD_RE.test(value)) {
        setPasswordError("At least 6 characters, including letters and numbers");
      } else if (form.confirmPassword && value !== form.confirmPassword) {
        setPasswordError("Passwords do not match");
      } else {
        setPasswordError("");
      }
    }
    if (name === "confirmPassword") {
      setPasswordError(value !== form.password ? "Passwords do not match" : "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!EMAIL_RE.test(form.email))             return setEmailError("Enter a valid email address");
    if (!PWD_RE.test(form.password))            return setPasswordError("At least 6 characters, including letters and numbers");
    if (form.password !== form.confirmPassword) return setPasswordError("Passwords do not match");

    setLoading(true);
    try {
      await API.post("/auth/register", {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
        location: form.location,
      });
      navigate("/verify", { state: { email: form.email } });
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">

      {/* LEFT */}
      <div className="auth-left">
        <div className="brand">
          <div className="brand-logo-row">
            <WasteZeroLogo size={36} />
            <h1>WasteZero</h1>
          </div>
          <h2>Join the Recycling Revolution</h2>
          <p>
            WasteZero connects volunteers, NGOs, and administrators
            to schedule pickups, manage recycling opportunities,
            and make a real impact on our environment.
          </p>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature-item" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-card">

          <div className="tabs">
            <button onClick={() => navigate("/login")}>Login</button>
            <button className="active">Register</button>
          </div>

          <h3>Create your account</h3>
          <p className="subtitle">Fill in your details to join WasteZero</p>

          {submitError && <div className="submit-error">{submitError}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input
                className="auth-input"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                className="auth-input"
                name="email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              {emailError && <p className="error-text">{emailError}</p>}
            </div>

            <div className="field-group">
              <label className="field-label">
                Location{" "}
                <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
              </label>
              <input
                className="auth-input"
                name="location"
                placeholder="City, State, Country"
                value={form.location}
                onChange={handleChange}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="password-field">
                <input
                  className="auth-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Confirm Password</label>
              <div className="password-field">
                <input
                  className="auth-input"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              {passwordError && <p className="error-text">{passwordError}</p>}
            </div>

            <div className="field-group">
              <label className="field-label">I am a…</label>
              <select
                className="auth-select"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="volunteer">Volunteer</option>
                <option value="ngo">NGO</option>
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Sending OTP…" : "Create Account"}
            </button>

          </form>

          <p className="auth-divider">
            Already have an account?{" "}
            <button className="auth-link" onClick={() => navigate("/login")}>Login</button>
          </p>

        </div>
      </div>

    </div>
  );
}