import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ShieldOff, Truck, BarChart2, Users } from "lucide-react";
import API from "../services/api";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

const FEATURES = [
  { icon: <Truck size={16} />,     title: "Schedule Pickups",  desc: "Easily arrange waste collection" },
  { icon: <BarChart2 size={16} />, title: "Track Impact",      desc: "Monitor your environmental contribution" },
  { icon: <Users size={16} />,     title: "Volunteer",         desc: "Join recycling initiatives" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state;

  const [form,          setForm]          = useState({ email: "", password: "" });
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [generalError,  setGeneralError]  = useState("");
  const [suspendReason, setSuspendReason] = useState(
    navState?.suspended ? navState.reason : ""
  );

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setGeneralError("");
    setSuspendReason("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError("");
    setSuspendReason("");
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user",  JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 403) {
        setSuspendReason(err.response.data.reason || "Platform policy violation");
      } else {
        setGeneralError("Invalid email or password");
      }
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
            and create lasting environmental impact.
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
            <button className="active">Login</button>
            <button onClick={() => navigate("/register")}>Register</button>
          </div>

          <h3>Welcome back</h3>
          <p className="subtitle">Sign in to continue using WasteZero</p>

          {generalError && <div className="submit-error">{generalError}</div>}

          {suspendReason && (
            <div className="suspended-banner">
              <div className="suspended-banner-top">
                <ShieldOff size={14} />
                <span>Account Suspended</span>
              </div>
              <p className="suspended-banner-reason">Reason: {suspendReason}</p>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                className="auth-input"
                name="email"
                type="email"
                placeholder="jane@example.com"
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="password-field">
                <input
                  className="auth-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
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

            <div className="forgot-row">
              <button type="button" className="auth-link" onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </button>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </button>

          </form>

          <p className="auth-divider">
            Don't have an account?{" "}
            <button className="auth-link" onClick={() => navigate("/register")}>Register</button>
          </p>

        </div>
      </div>

    </div>
  );
}

