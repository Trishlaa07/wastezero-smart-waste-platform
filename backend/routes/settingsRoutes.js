const express = require("express");
const router  = express.Router();
const { updateProfile, changePassword, deactivateAccount } = require("../controllers/settingsController");
const { verifyToken } = require("../middleware/authMiddleware");

router.put("/profile",         verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.delete("/account",      verifyToken, deactivateAccount);

module.exports = router;