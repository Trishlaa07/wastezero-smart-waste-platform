import { useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ShieldOff } from "lucide-react";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

function Login() {

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ If kicked out via socket, location.state will carry the suspended reason
  const navState = location.state;

  const [form,          setForm]          = useState({ email: "", password: "" });
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [generalError,  setGeneralError]  = useState("");
  const [suspendReason, setSuspendReason] = useState(
    navState?.suspended ? navState.reason : ""
  );

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 403) {
        // Suspended on login attempt
        setSuspendReason(
          error.response.data.reason || "Platform policy violation"
        );
      } else {
        setGeneralError("Invalid email or password");
      }
    }

    setLoading(false);
  };

  return (
    <div className="auth-wrapper">

      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="brand">
          <WasteZeroLogo size={42} />
          <h1>WasteZero</h1>
          <h2>Join the Recycling Revolution</h2>
          <p>
            WasteZero connects volunteers, NGOs, and administrators
            to schedule pickups, manage recycling opportunities,
            and create environmental impact.
          </p>
          <div className="features">
            <div><h4>Schedule Pickups</h4><p>Easily arrange waste collection</p></div>
            <div><h4>Track Impact</h4><p>Monitor environmental contribution</p></div>
            <div><h4>Volunteer</h4><p>Join recycling initiatives</p></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-container">

          <div className="tabs">
            <button className="active">Login</button>
            <button onClick={() => navigate("/register")}>Register</button>
          </div>

          <h3>Welcome Back</h3>
          <p className="subtitle">Login to continue using WasteZero</p>

          {/* Simple invalid credentials error */}
          {generalError && (
            <p className="error-text">{generalError}</p>
          )}

          {/* ✅ Inline suspended banner — shown on manual login attempt OR auto-kick */}
          {suspendReason && (
            <div className="suspended-banner">
              <div className="suspended-banner-top">
                <ShieldOff size={15} />
                <span>Account Suspended</span>
              </div>
              <p className="suspended-banner-reason">
                Reason: {suspendReason}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              required
            />

            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <span onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
            </div>

            <p
              style={{ textAlign: "right", fontSize: "13px", color: "#134e5e", cursor: "pointer" }}
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </p>

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

          </form>

        </div>
      </div>

    </div>
  );
}

export default Login;