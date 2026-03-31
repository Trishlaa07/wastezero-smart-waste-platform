const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  getPreferences,
  updatePreferences,
  updateNotifications,
  updateProfile,
  changePassword,
  deactivateAccount,
} = require("../controllers/settingsController");

/* ── Preferences (autoMatch, profileVisibility, etc.) ── */
router.get ("/preferences",    verifyToken, getPreferences);
router.put ("/preferences",    verifyToken, updatePreferences);

/* ── Notification preferences ── */
router.put ("/notifications",  verifyToken, updateNotifications);

/* ── Profile ── */
router.put ("/profile",        verifyToken, updateProfile);

/* ── Password ── */
router.put ("/change-password", verifyToken, changePassword);

/* ── Deactivate (self) ── */
router.delete("/account",      verifyToken, deactivateAccount);

module.exports = router;