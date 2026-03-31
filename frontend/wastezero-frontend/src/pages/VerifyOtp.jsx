import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MailCheck } from "lucide-react";
import API from "../services/api";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

const MAX_ATTEMPTS = 5;
const OTP_TTL      = 600;

function maskEmail(email = "") {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 4))}@${domain}`;
}

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email || "";

  const [otp,       setOtp]       = useState(Array(6).fill(""));
  const [error,     setError]     = useState("");
  const [timer,     setTimer]     = useState(OTP_TTL);
  const [attempts,  setAttempts]  = useState(0);
  const [locked,    setLocked]    = useState(false);
  const [resending, setResending] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => { inputsRef.current[0]?.focus(); }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (attempts >= MAX_ATTEMPTS) {
      setLocked(true);
      setError("Too many failed attempts. Please resend a new OTP.");
    }
  }, [attempts]);

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value) || locked) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputsRef.current[index - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = Array(6).fill("").map((_, i) => pasted[i] || "");
    setOtp(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async () => {
    if (locked || timer <= 0) return;
    if (otp.some((d) => d === "")) return setError("Please enter all 6 digits");
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/verify-otp", { email, otp: otp.join("") });
      navigate("/login");
    } catch (err) {
      setAttempts((a) => a + 1);
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setResending(true);
    setError("");
    try {
      await API.post("/auth/resend-otp", { email });
      setOtp(Array(6).fill(""));
      setTimer(OTP_TTL);
      setAttempts(0);
      setLocked(false);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const formatTime = () => {
    const m = Math.floor(timer / 60);
    const s = timer % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
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
          <h2>Almost there!</h2>
          <p>
            We've sent a one-time password to your email address.
            Enter it below to verify your account and get started.
          </p>
          <div className="features">
            <div className="feature-item">
              <div className="feature-icon"><MailCheck size={16} /></div>
              <div className="feature-text">
                <h4>Check your inbox</h4>
                <p>The OTP may take a minute to arrive</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="verify-card">

          <div className="verify-logo-wrap">
            <WasteZeroLogo size={26} />
          </div>

          <h2 className="verify-title">Verify your email</h2>
          <p className="verify-subtext">
            OTP sent to <strong>{maskEmail(email)}</strong>
          </p>

          {error && <p className="verify-error">{error}</p>}

          <div className="otp-container" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength="1"
                value={digit}
                placeholder="·"
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                ref={(el) => (inputsRef.current[i] = el)}
                disabled={locked}
              />
            ))}
          </div>

          <button
            className="btn-verify"
            onClick={handleSubmit}
            disabled={loading || locked || timer <= 0}
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>

          <p className="verify-timer">
            {timer > 0
              ? <>OTP expires in <strong>{formatTime()}</strong></>
              : <span style={{ color: "#dc2626" }}>OTP expired — please resend</span>
            }
          </p>

          <p className="verify-resend">
            Didn't receive it?{" "}
            <button className="auth-link" onClick={resendOtp} disabled={resending}>
              {resending ? "Sending…" : "Resend OTP"}
            </button>
          </p>

        </div>
      </div>

    </div>
  );
}