const User   = require("../models/User");
const bcrypt = require("bcryptjs");

/* =========================================
   GET PREFERENCES
   GET /api/settings/preferences
========================================= */
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "profileVisibility autoMatch notificationPrefs role"
    );
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      data: {
        profileVisibility: user.profileVisibility,
        autoMatch:         user.autoMatch,
        // Admin only gets general notification pref
        emailNotifications: user.notificationPrefs.general,
        ...(user.role !== "admin" && {
          activityNotifications: user.notificationPrefs.activity,
          chatNotifications:     user.notificationPrefs.chat,
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
   UPDATE PREFERENCES  (toggles)
   PUT /api/settings/preferences
   body: { autoMatch, autoExpiry, profileVisibility,
           maintenanceMode, allowRegistrations,
           emailDigest, autoFlagReports }
========================================= */
const updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const allowed = [
      "autoMatch",
      "profileVisibility",
      "autoExpiry",
      "maintenanceMode",
      "allowRegistrations",
      "emailDigest",
      "autoFlagReports",
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    });

    await user.save();

    res.status(200).json({ success: true, message: "Preferences updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
   UPDATE NOTIFICATION PREFERENCES
   PUT /api/settings/notifications
   body: { type: "general"|"activity"|"chat", enabled: true|false }
         OR legacy: { email: true|false }  ← kept for backwards compat
========================================= */
const updateNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const { type, enabled, email } = req.body;

    // Legacy support: { email: bool } maps to general
    if (email !== undefined) {
      user.notificationPrefs.general = email;
    }

    if (type && enabled !== undefined) {
      const validTypes = ["general", "activity", "chat"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid notification type" });
      }
      // Admin can only toggle general
      if (user.role === "admin" && type !== "general") {
        return res.status(403).json({
          success: false,
          message: "Admins can only configure general notifications",
        });
      }
      user.notificationPrefs[type] = enabled;
    }

    user.markModified("notificationPrefs");
    await user.save();

    res.status(200).json({ success: true, message: "Notification preferences updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
   UPDATE PROFILE
   PUT /api/settings/profile
========================================= */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, bio, skills } = req.body;
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    if (name     !== undefined) user.name     = name;
    if (phone    !== undefined) user.phone    = phone;
    if (location !== undefined) user.location = location;
    if (bio      !== undefined) user.bio      = bio;
    if (skills   !== undefined) user.skills   = skills;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data:    updatedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
   CHANGE PASSWORD
   PUT /api/settings/change-password
========================================= */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both fields are required" });

    if (newPassword.length < 6)
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });

    const user = await User.findById(req.user.id).select("+password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Incorrect current password" });

    // Let the pre-save hook hash the new password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =========================================
   DEACTIVATE ACCOUNT  (self)
   DELETE /api/settings/account

   Sets status = "inactive" — NOT deleted,
   NOT suspended. Login will auto-reactivate.
========================================= */
const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.status = "inactive";
    await user.save();

    res.status(200).json({ success: true, message: "Account deactivated. Log in again to reactivate." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  updateNotifications,
  updateProfile,
  changePassword,
  deactivateAccount,
};