require("dotenv").config();

// ✅ Brevo HTTP API — uses port 443, never blocked by Render free tier
const Brevo = require("@getbrevo/brevo");

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

const transporter = {

  /* Drop-in replacement for nodemailer transporter.sendMail()
     Accepts the same { from, to, subject, html } options */
  sendMail: async ({ from, to, subject, html }) => {
    const email = new Brevo.SendSmtpEmail();

    email.sender       = { name: "WasteZero Team", email: process.env.EMAIL_USER };
    email.to           = [{ email: to }];
    email.subject      = subject;
    email.htmlContent  = html;

    return apiInstance.sendTransacEmail(email);
  },

  // Called on server start to confirm config is valid
  verify: (cb) => {
    if (process.env.BREVO_API_KEY) {
      console.log("✅ Mail server is ready (Brevo API)");
      cb(null, true);
    } else {
      const err = new Error("BREVO_API_KEY is not set in environment");
      console.log("❌ MAIL CONFIG ERROR:", err.message);
      cb(err);
    }
  },
};

module.exports = transporter;
