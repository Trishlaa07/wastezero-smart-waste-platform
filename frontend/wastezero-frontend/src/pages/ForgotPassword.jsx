import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 4))}@${domain}`;
}

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(""); // ✅ inline validation
  const [success, setSuccess] = useState("");

  const [timer, setTimer] = useState(600);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => {
    if (step !== "otp") return;
    inputsRef.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return;
    const interval = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const validatePassword = (pwd) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(pwd);

  // ✅ Real-time password validation on every keystroke
  const handlePasswordChange = (field, value) => {
    if (field === "new") {
      setNewPassword(value);

      if (!validatePassword(value)) {
        setPasswordError("Password must be at least 6 characters with letters and numbers");
      } else if (confirmPassword && value !== confirmPassword) {
        setPasswordError("Passwords do not match");
      } else {
        setPasswordError("");
      }
    }

    if (field === "confirm") {
      setConfirmPassword(value);

      if (value !== newPassword) {
        setPasswordError("Passwords do not match");
      } else {
        setPasswordError("");
      }
    }
  };

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setError("Enter a valid email address");
        return;
    }

    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setStep("otp");
      setTimer(600);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  /* ── OTP input handlers ── */
  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputsRef.current[index - 1]?.focus();
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async () => {
    if (otp.some((d) => d === "")) return setError("Enter the complete OTP");
    setError("");
    setLoading(true);
    try {
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    }
    setLoading(false);
  };

  /* ── Step 3: Reset password ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePassword(newPassword)) {
      setPasswordError("Password must be at least 6 characters with letters and numbers");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", {
        email,
        otp: otp.join(""),
        newPassword,
      });
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
      if (err.response?.status === 400) setStep("otp");
    }
    setLoading(false);
  };

  const resendOtp = async () => {
    setResending(true);
    setError("");
    try {
      await API.post("/auth/forgot-password", { email });
      setOtp(Array(6).fill(""));
      setTimer(600);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
    setResending(false);
  };

  return (
    <div className="auth-wrapper">

      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="brand">
          <WasteZeroLogo size={42} />
          <h1>WasteZero</h1>
          <h2>Reset Your Password</h2>
          <p>
            Enter your registered email and we'll send you a one-time
            password to securely reset your account password.
          </p>
          <div className="features">
            <div><h4>Secure OTP</h4><p>Sent to your email</p></div>
            <div><h4>Expires in 10m</h4><p>Time-limited for safety</p></div>
            <div><h4>Instant Access</h4><p>Login right after reset</p></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-container verify-container">

          {/* ── STEP 1: Email ── */}
          {step === "email" && (
            <>
              <h2 className="verify-title">Forgot Password</h2>
              <p className="verify-subtext">Enter your registered email address</p>

              {error && <p className="verify-error">{error}</p>}

              <form onSubmit={handleSendOtp} style={{ width: "100%" }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ marginBottom: "12px" }}
                />
                <button
                  className="verify-btn"
                  type="submit"
                  style={{ width: "100%" }}
                  disabled={loading}
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>

              <p style={{ marginTop: "16px", fontSize: "14px" }}>
                Remember your password?{" "}
                <span
                  onClick={() => navigate("/login")}
                  style={{ color: "#134e5e", fontWeight: "600", cursor: "pointer" }}
                >
                  Login
                </span>
              </p>
            </>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <>
              <h2 className="verify-title">Enter OTP</h2>
              <p className="verify-subtext">
                OTP sent to <strong>{maskEmail(email)}</strong>
              </p>

              {error && <p className="verify-error">{error}</p>}

              <div className="otp-container">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    ref={(el) => (inputsRef.current[index] = el)}
                  />
                ))}
              </div>

              <button
                className="verify-btn"
                onClick={handleVerifyOtp}
                disabled={loading || timer <= 0}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <p className="verify-timer">
                OTP expires in <strong>{formatTime()}</strong>
              </p>

              <p style={{ marginTop: "12px", fontSize: "14px" }}>
                Didn't receive OTP?{" "}
                <span
                  onClick={resendOtp}
                  style={{ color: "#134e5e", fontWeight: "600", cursor: "pointer" }}
                >
                  {resending ? "Sending..." : "Resend"}
                </span>
              </p>
            </>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === "reset" && (
            <>
              <h2 className="verify-title">New Password</h2>
              <p className="verify-subtext">Choose a strong new password</p>

              {error && <p className="verify-error">{error}</p>}
              {success && (
                <p style={{ color: "green", fontSize: "14px", marginBottom: "12px" }}>
                  {success}
                </p>
              )}

              <form
                onSubmit={handleResetPassword}
                style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <div className="password-field">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => handlePasswordChange("new", e.target.value)} // ✅
                    required
                  />
                  <span onClick={() => setShowNew(!showNew)}>
                    {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                  </span>
                </div>

                <div className="password-field">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => handlePasswordChange("confirm", e.target.value)} // ✅
                    required
                  />
                  <span onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                  </span>
                </div>

                {/* ✅ shows below both fields, same as Register */}
                {passwordError && <p className="error-text">{passwordError}</p>}

                <button
                  className="verify-btn"
                  type="submit"
                  style={{ width: "100%" }}
                  disabled={loading || !!passwordError} // ✅ button disabled if error exists
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>

              </form>
            </>
          )}

        </div>
      </div>

    </div>
  );
}

export default ForgotPassword;