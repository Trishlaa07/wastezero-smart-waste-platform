require("dotenv").config();

const { TransactionalEmailsApi, SendSmtpEmail, ApiClient } = require("@getbrevo/brevo");

// ✅ Brevo HTTP API — uses port 443, never blocked by Render free tier
const apiInstance = new TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

const transporter = {

  sendMail: async ({ from, to, subject, html }) => {
    const email = new SendSmtpEmail();
    email.sender      = { name: "WasteZero Team", email: process.env.EMAIL_USER };
    email.to          = [{ email: to }];
    email.subject     = subject;
    email.htmlContent = html;
    return apiInstance.sendTransacEmail(email);
  },

  verify: (cb) => {
    if (process.env.BREVO_API_KEY) {
      console.log("✅ Mail server is ready (Brevo API)");
      cb(null, true);
    } else {
      const err = new Error("BREVO_API_KEY is not set");
      console.log("❌ MAIL CONFIG ERROR:", err.message);
      cb(err);
    }
  },
};

module.exports = transporter;
