const express = require("express");
const router = express.Router();
const { getWasteStats, getUserWasteStats } = require("../controllers/statsController");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

// Private - Get overall waste statistics (Admin and NGO)
router.get("/waste", verifyToken, authorizeRoles("admin", "ngo"), getWasteStats);

// Private - Get user's personal waste statistics
router.get("/user-waste", verifyToken, getUserWasteStats);

module.exports = router;
