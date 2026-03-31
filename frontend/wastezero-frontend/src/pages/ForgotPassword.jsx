import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Timer, Zap } from "lucide-react";
import API from "../services/api";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PWD_RE   = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
const OTP_TTL  = 600;

function maskEmail(email = "") {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 4))}@${domain}`;
}

const LEFT_CONTENT = {
  email: {
    title: "Reset Your Password",
    desc:  "Enter your registered email and we'll send you a one-time password to securely reset your account.",
    features: [
      { icon: <ShieldCheck size={16} />, title: "Secure OTP",     desc: "Sent only to your registered email" },
      { icon: <Timer size={16} />,       title: "Expires in 10m", desc: "Time-limited for your security" },
      { icon: <Zap size={16} />,         title: "Instant Access", desc: "Login right after reset" },
    ],
  },
  otp: {
    title: "Check Your Email",
    desc:  "We've sent a 6-digit code to your email. Enter it to proceed to the password reset step.",
    features: [
      { icon: <ShieldCheck size={16} />, title: "Secure OTP",     desc: "Sent only to your registered email" },
      { icon: <Timer size={16} />,       title: "Expires in 10m", desc: "Time-limited for your security" },
      { icon: <Zap size={16} />,         title: "Instant Access", desc: "Login right after reset" },
    ],
  },
  reset: {
    title: "Choose a New Password",
    desc:  "Almost done! Set a strong new password to regain access to your WasteZero account.",
    features: [
      { icon: <ShieldCheck size={16} />, title: "Strong Password", desc: "At least 6 chars, letters & numbers" },
      { icon: <Zap size={16} />,         title: "Instant Access",  desc: "Login right after reset" },
    ],
  },
};

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step,            setStep]            = useState("email");
  const [email,           setEmail]           = useState("");
  const [otp,             setOtp]             = useState(Array(6).fill(""));
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [resending,       setResending]       = useState(false);
  const [error,           setError]           = useState("");
  const [passwordError,   setPasswordError]   = useState("");
  const [success,         setSuccess]         = useState("");
  const [timer,           setTimer]           = useState(OTP_TTL);

  const inputsRef = useRef([]);

  useEffect(() => {
    if (step === "otp") inputsRef.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePasswordChange = (field, value) => {
    if (field === "new") {
      setNewPassword(value);
      if (!PWD_RE.test(value)) {
        setPasswordError("At least 6 characters, including letters and numbers");
      } else if (confirmPassword && value !== confirmPassword) {
        setPasswordError("Passwords do not match");
      } else {
        setPasswordError("");
      }
    }
    if (field === "confirm") {
      setConfirmPassword(value);
      setPasswordError(value !== newPassword ? "Passwords do not match" : "");
    }
  };

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputsRef.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = Array(6).fill("").map((_, i) => pasted[i] || "");
    setOtp(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setTimer(OTP_TTL);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.some((d) => d === "")) return setError("Please enter all 6 digits");
    setError("");
    setStep("reset");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!PWD_RE.test(newPassword))      return setPasswordError("At least 6 characters, including letters and numbers");
    if (newPassword !== confirmPassword) return setPasswordError("Passwords do not match");
    setLoading(true);
    try {
      await API.post("/auth/reset-password", { email, otp: otp.join(""), newPassword });
      setSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password.");
      if (err.response?.status === 400) setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setResending(true);
    setError("");
    try {
      await API.post("/auth/forgot-password", { email });
      setOtp(Array(6).fill(""));
      setTimer(OTP_TTL);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const left = LEFT_CONTENT[step];

  return (
    <div className="auth-wrapper">

      {/* LEFT */}
      <div className="auth-left">
        <div className="brand">
          <div className="brand-logo-row">
            <WasteZeroLogo size={36} />
            <h1>WasteZero</h1>
          </div>
          <h2>{left.title}</h2>
          <p>{left.desc}</p>
          <div className="features">
            {left.features.map((f) => (
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
        <div className="verify-card">

          <div className="verify-logo-wrap">
            <WasteZeroLogo size={26} />
          </div>

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <>
              <h2 className="verify-title">Forgot Password</h2>
              <p className="verify-subtext">Enter your registered email address</p>
              {error && <p className="verify-error">{error}</p>}
              <form
                onSubmit={handleSendOtp}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
              >
                <input
                  className="auth-input"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  className="btn-verify"
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "0 24px" }}
                >
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
              <p className="verify-resend" style={{ marginTop: 20 }}>
                Remember your password?{" "}
                <button className="auth-link" onClick={() => navigate("/login")}>Login</button>
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <>
              <h2 className="verify-title">Enter OTP</h2>
              <p className="verify-subtext">
                Code sent to <strong>{maskEmail(email)}</strong>
              </p>
              {error && <p className="verify-error">{error}</p>}
              <div className="otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    placeholder="·"
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    ref={(el) => (inputsRef.current[i] = el)}
                  />
                ))}
              </div>
              <button
                className="btn-verify"
                onClick={handleVerifyOtp}
                disabled={loading || timer <= 0}
              >
                {loading ? "Verifying…" : "Verify OTP"}
              </button>
              <p className="verify-timer">
                {timer > 0
                  ? <>Expires in <strong>{formatTime()}</strong></>
                  : <span style={{ color: "#dc2626" }}>OTP expired — please resend</span>
                }
              </p>
              <p className="verify-resend">
                Didn't receive it?{" "}
                <button className="auth-link" onClick={resendOtp} disabled={resending}>
                  {resending ? "Sending…" : "Resend OTP"}
                </button>
              </p>
            </>
          )}

          {/* ── Step 3: Reset ── */}
          {step === "reset" && (
            <>
              <h2 className="verify-title">New Password</h2>
              <p className="verify-subtext">Choose a strong password to secure your account</p>
              {error   && <p className="verify-error">{error}</p>}
              {success && <p className="success-text">{success}</p>}
              <form
                onSubmit={handleResetPassword}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div className="password-field">
                  <input
                    className="auth-input"
                    type={showNew ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => handlePasswordChange("new", e.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowNew((v) => !v)}>
                    {showNew ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                <div className="password-field">
                  <input
                    className="auth-input"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => handlePasswordChange("confirm", e.target.value)}
                    required
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)}>
                    {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                {passwordError && <p className="error-text">{passwordError}</p>}

                <button
                  className="btn-verify"
                  type="submit"
                  style={{ width: "100%", padding: "0 24px" }}
                  disabled={loading || !!passwordError}
                >
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>

    </div>
  );
}