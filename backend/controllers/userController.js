const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* ================= GET PROFILE ================= */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PROFILE ================= */
const axios = require("axios");

exports.updateProfile = async (req, res) => {
  try {

    const { name, phone, location, skills, bio } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;

    if (phone !== undefined) {
      if (phone && !phone.startsWith("+")) {
        user.phone = "+" + phone;
      } else {
        user.phone = phone;
      }
    }

    /* ================= LOCATION UPDATE ================= */

    if (location !== undefined) {

      user.location = location;

      try {

        const geoRes = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: location,
              format: "json",
              limit: 1
            },
            headers: {
              "User-Agent": "wastezero-app"
            }
          }
        );

        if (geoRes.data.length > 0) {

          user.coordinates = {
            lat: parseFloat(geoRes.data[0].lat),
            lng: parseFloat(geoRes.data[0].lon)
          };

        }

      } catch (err) {
        console.log("Location update geocode error:", err.message);
      }

    }

    /* ==================================================== */

    if (skills !== undefined) user.skills = skills;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({ message: "Profile updated successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= CHANGE PASSWORD ================= */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // ✅ Set new password (will auto hash because of pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= VERIFY CURRENT PASSWORD ================= */
exports.verifyCurrentPassword = async (req, res) => {
  try {
    const { currentPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    res.json({ message: "Password correct" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};