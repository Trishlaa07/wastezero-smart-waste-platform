const nodemailer = require("nodemailer");
const dns        = require("dns");
require("dotenv").config();

// ✅ Force all DNS lookups to return IPv4 addresses
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  service: "gmail",
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
