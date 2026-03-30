const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

const {
  getProfile,
  updateProfile,
  changePassword,
  verifyCurrentPassword
} = require("../controllers/userController");

router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);
router.post("/verify-password", verifyToken, verifyCurrentPassword);

router.get("/test-route", (req, res) => {
  res.json({ message: "User route working" });
});

module.exports = router;