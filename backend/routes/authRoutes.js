const express = require("express");
const router = express.Router();
console.log("Auth Routes Loaded");

const {
  registerUser,
  verifyOtp,
  loginUser,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");

const { verifyToken } = require("../middleware/authMiddleware");

router.post("/register",        registerUser);
router.post("/verify-otp",      verifyOtp);
router.post("/login",           loginUser);
router.post("/resend-otp",      resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.get("/me",               verifyToken, getMe);

module.exports = router;