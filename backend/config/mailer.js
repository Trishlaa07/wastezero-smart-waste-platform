const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  family:  4,          // ✅ force IPv4 — fixes ENETUNREACH on Render
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password WITHOUT spaces
  },
});

/* 🔎 Verify connection on server start */
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ MAIL CONFIG ERROR:", error);
  } else {
    console.log("✅ Mail server is ready");
  }
});

module.exports = transporter;
