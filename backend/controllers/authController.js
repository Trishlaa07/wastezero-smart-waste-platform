const User = require("../models/User");
const bcrypt = require("bcryptjs");
const transporter = require("../config/mailer");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { createNotification } = require("./notificationController");

/* ================= REGISTER ================= */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("REGISTER OTP:", otp);

    /* ── GEOLOCATION ── */
    let lat = null;
    let lng = null;

    if (location) {
      try {
        const geoRes = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: { q: location, format: "json", limit: 1 },
            headers: { "User-Agent": "wastezero-app" }
          }
        );
        if (geoRes.data.length > 0) {
          lat = parseFloat(geoRes.data[0].lat);
          lng = parseFloat(geoRes.data[0].lon);
        }
      } catch (err) {
        console.log("Geocode error:", err.message);
      }
    }

    /* ── CLEAN OLD UNVERIFIED USER ── */
    if (existingUser && !existingUser.isVerified) {
      await User.deleteOne({ email });
    }

    /* ── CREATE USER ── */
    const newUser = new User({
      name,
      email,
      password,
      role: role || "volunteer",
      location: location || "",
      coordinates: { lat, lng },
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
      isVerified: false,
    });

    await newUser.save();

    /* ── NOTIFY ADMINS (new_user type with relatedId) ── */
    if (newUser.role === "ngo" || newUser.role === "volunteer") {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          `New ${newUser.role} registered: ${newUser.name}`,
          "new_user",
          newUser._id,
          "User"
        );
      }
    }

    /* ── SEND OTP EMAIL ── */
    await transporter.sendMail({
      from: `"WasteZero Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔒 Verify Your WasteZero Account",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;background:#f9fafb;padding:20px;">
          <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:30px;text-align:center;">
            <h2 style="color:#111827;">Account Verification</h2>
            <p>Hello <strong>${name}</strong>, welcome to WasteZero.</p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#2f7d6b;">${otp}</div>
            <p>This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });

    console.log("✅ REGISTER EMAIL SENT");
    res.status(201).json({ message: "OTP sent successfully" });

  } catch (error) {
    console.log("❌ REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({
        message: "Too many attempts. Please resend OTP."
      });
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified  = true;
    user.otp         = null;
    user.otpExpiry   = null;
    user.otpAttempts = 0;
    await user.save();

    res.json({ message: "Account verified successfully" });

  } catch (error) {
    console.log("❌ VERIFY ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= RESEND OTP ================= */
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp       = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    await transporter.sendMail({
      from: `"WasteZero Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔁 Your New WasteZero OTP",
      html: `<h2>Your new OTP is ${otp}</h2>`,
    });

    console.log("✅ RESEND EMAIL SENT");
    res.json({ message: "OTP resent successfully" });

  } catch (error) {
    console.log("❌ RESEND ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= LOGIN =================
   Drop this loginUser export into your
   existing authController.js, replacing
   the current one.
================================================ */

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) {
      return res.status(400).json({ message: "Verify OTP first" });
    }

    /* ── Admin-imposed suspension — hard block ── */
    if (user.isSuspended) {
      return res.status(403).json({
        message: "Account suspended",
        reason:  user.suspensionReason,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    /* ── Self-deactivated: silently reactivate on login ── */
    if (user.status === "inactive") {
      user.status = "active";
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });

  } catch (error) {
    console.log("❌ LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
/* ================= FORGOT PASSWORD ================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "No account found with this email" });
    }
    if (!user.isVerified) {
      return res.status(400).json({ message: "This email is not verified. Please register first." });
    }
    if (user.isSuspended) {
      return res.status(403).json({ message: "Your account is suspended. Contact support." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("FORGOT PASSWORD OTP:", otp);

    user.otp         = otp;
    user.otpExpiry   = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;
    await user.save();

    await transporter.sendMail({
      from: `"WasteZero Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your WasteZero Password",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;background:#f9fafb;padding:20px;">
          <div style="max-width:500px;margin:auto;background:#fff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:30px;text-align:center;">
            <h2 style="color:#111827;">Password Reset</h2>
            <p>Hello <strong>${user.name}</strong>, use this OTP to reset your password.</p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#134e5e;margin:20px 0;">${otp}</div>
            <p style="color:#6b7280;font-size:13px;">This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
    });

    res.json({ message: "OTP sent to your registered email" });

  } catch (error) {
    console.log("❌ FORGOT PASSWORD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= RESET PASSWORD ================= */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (user.otpAttempts >= 5) {
      return res.status(400).json({ message: "Too many attempts. Request a new OTP." });
    }

    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters with letters and numbers",
      });
    }

    user.password    = newPassword;
    user.otp         = null;
    user.otpExpiry   = null;
    user.otpAttempts = 0;
    await user.save();

    console.log("✅ PASSWORD RESET for:", email);
    res.json({ message: "Password reset successfully" });

  } catch (error) {
    console.log("❌ RESET PASSWORD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET ME ================= */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry -otpAttempts"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.log("❌ GET ME ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};