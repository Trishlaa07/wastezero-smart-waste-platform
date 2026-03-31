const User    = require("../models/User");
const bcrypt  = require("bcryptjs");

// @desc    Update user profile settings
// @route   PUT /api/settings/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, bio, skills } = req.body;
    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.name     = name     || user.name;
    user.phone    = phone    || user.phone;
    user.location = location || user.location;
    user.bio      = bio      || user.bio;
    user.skills   = skills   || user.skills;

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

// @desc    Change user password
// @route   PUT /api/settings/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Both fields are required" });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.id).select("+password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    // Support both comparePassword method and direct bcrypt compare
    let isMatch = false;
    if (typeof user.comparePassword === "function") {
      isMatch = await user.comparePassword(currentPassword);
    } else {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    }

    if (!isMatch)
      return res.status(401).json({ success: false, message: "Incorrect current password" });

    // Hash new password before saving
    const salt    = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Deactivate user account
// @route   DELETE /api/settings/account
// @access  Private
const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    user.isSuspended      = true;
    user.suspensionReason = "Account deactivated by user";

    await user.save();

    res.status(200).json({ success: true, message: "Account deactivated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { updateProfile, changePassword, deactivateAccount };