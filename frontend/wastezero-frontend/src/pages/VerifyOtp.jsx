import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

/* 📧 Email Mask */
function maskEmail(email) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 4))}@${domain}`;
}

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(600);
  const [resending, setResending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef([]);

  /* Focus first box */
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  /* Timer */
  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  /* Lock after 5 attempts */
  useEffect(() => {
    if (attempts >= 5) {
      setLocked(true);
      setError("Too many failed attempts. Please resend OTP.");
    }
  }, [attempts]);

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value) || locked) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (locked || timer <= 0) return;

    if (otp.some((digit) => digit === "")) {
      setError("Please enter complete OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await API.post("/auth/verify-otp", {
        email,
        otp: otp.join(""),
      });

      navigate("/login");

    } catch (err) {
      setAttempts((prev) => prev + 1);
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setResending(true);
      setError("");

      await API.post("/auth/resend-otp", { email });

      setOtp(Array(6).fill(""));
      setTimer(600);
      setAttempts(0);
      setLocked(false);

      inputsRef.current[0]?.focus();

    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div className="auth-wrapper">

      {/* LEFT INFO PANEL */}
      <div className="auth-left">

        <div className="brand">

          <WasteZeroLogo size={42} />

          <h1>WasteZero</h1>

          <h2>Join the Recycling Revolution</h2>

          <p>
            WasteZero connects volunteers, NGOs, and administrators
            to schedule pickups, manage recycling opportunities,
            and make a positive impact on our environment.
          </p>

          <div className="features">

            <div>
              <h4>Schedule Pickups</h4>
              <p>Easily arrange waste collection</p>
            </div>

            <div>
              <h4>Track Impact</h4>
              <p>Monitor your environmental contribution</p>
            </div>

            <div>
              <h4>Volunteer</h4>
              <p>Join recycling initiatives</p>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-right">

        <div className="auth-container verify-container">

          <WasteZeroLogo size={34} />

          <h2 className="verify-title">Verify OTP</h2>

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
                pattern="[0-9]*"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                ref={(el) => (inputsRef.current[index] = el)}
              />
            ))}

          </div>

          <button className="verify-btn" onClick={handleSubmit}>
            {loading ? "Verifying..." : "Verify"}
          </button>

          <p className="verify-timer">
            OTP expires in <strong>{formatTime()}</strong>
          </p>

          <p style={{ marginTop: "12px", fontSize: "14px" }}>
            Didn't receive OTP?{" "}
            <span
              onClick={resendOtp}
              style={{
                color: "#134e5e",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {resending ? "Sending..." : "Resend"}
            </span>
          </p>

        </div>

      </div>

    </div>
  );
}

export default VerifyOtp;