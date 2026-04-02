require("dotenv").config();
const axios = require("axios");

// ✅ Brevo REST API — HTTPS port 443, never blocked by Render
// ✅ 10s timeout so failures are fast, not hanging
const transporter = {

  sendMail: async ({ from, to, subject, html }) => {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender:      { name: "WasteZero Team", email: process.env.EMAIL_USER },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key":      process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept":       "application/json",
        },
        timeout: 10000, // ✅ fail fast after 10s instead of hanging forever
      }
    );
  },

  verify: (cb) => {
    if (process.env.BREVO_API_KEY) {
      console.log("✅ Mail server is ready (Brevo REST API)");
      cb(null, true);
    } else {
      const err = new Error("BREVO_API_KEY is not set");
      console.log("❌ MAIL CONFIG ERROR:", err.message);
      cb(err);
    }
  },
};

module.exports = transporter;
