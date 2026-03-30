import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/auth.css";

function Register() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    location: "",
    password: "",
    confirmPassword: "",
    role: "volunteer"
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  const validatePassword = (password) =>
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

  const handleChange = (e) => {

    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === "email") {
      setEmailError(!validateEmail(value) ? "Enter a valid email address" : "");
    }

    if (name === "password" || name === "confirmPassword") {

      if (name === "password" && !validatePassword(value)) {
        setPasswordError(
          "Password must be at least 6 characters and include letters and numbers"
        );
      }

      else if (name === "confirmPassword" && value !== form.password) {
        setPasswordError("Passwords do not match");
      }

      else if (
        name === "password" &&
        form.confirmPassword &&
        value !== form.confirmPassword
      ) {
        setPasswordError("Passwords do not match");
      }

      else {
        setPasswordError("");
      }
    }
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    setSubmitError("");

    if (!validateEmail(form.email)) {
      setEmailError("Enter a valid email address");
      return;
    }

    if (!validatePassword(form.password)) {
      setPasswordError(
        "Password must be at least 6 characters and include letters and numbers"
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {

      await API.post("/auth/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        location: form.location
      });

      navigate("/verify", { state: { email: form.email } });

    } catch (err) {

      setSubmitError(err.response?.data?.message || "Registration failed");

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
            and make a positive impact on our environment.
          </p>

          <div className="features">

            <div>
              <h4>Schedule Pickups</h4>
              <p>Easily arrange waste collection</p>
            </div>

            <div>
              <h4>Track Impact</h4>
              <p>Monitor environmental contribution</p>
            </div>

            <div>
              <h4>Volunteer</h4>
              <p>Join recycling initiatives</p>
            </div>

          </div>

        </div>

      </div>

      {/* RIGHT PANEL */}

      <div className="auth-right">

        <div className="auth-container">

          <div className="tabs">
            <button onClick={() => navigate("/login")}>Login</button>
            <button className="active">Register</button>
          </div>

          <h3>Create a new account</h3>
          <p className="subtitle">Fill in your details to join WasteZero</p>

          {submitError && <p className="error-text">{submitError}</p>}

          <form onSubmit={handleSubmit}>

            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />

            {emailError && <p className="error-text">{emailError}</p>}

            <input
              name="location"
              placeholder="City, State, Country"
              value={form.location}
              onChange={handleChange}
            />

            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
              />

              <span onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
            </div>

            <div className="password-field">

              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />

              <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>

            </div>

            {passwordError && <p className="error-text">{passwordError}</p>}

            <select
              className="role-select"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="volunteer">Volunteer</option>
              <option value="ngo">NGO</option>
            </select>

            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Create Account"}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
}

export default Register;