const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host:   "74.125.135.108",  // smtp.gmail.com IPv4 — bypasses IPv6 DNS resolution
  port:   587,
  secure: false,             // STARTTLS on 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,  // App password WITHOUT spaces
  },
  tls: {
    rejectUnauthorized: false,
    servername: "smtp.gmail.com",  // SNI still uses the correct hostname
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
