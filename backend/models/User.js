const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:     String,
      required: true,
    },
    role: {
      type:    String,
      enum:    ["admin", "ngo", "volunteer"],
      default: "volunteer",
    },

    phone:    { type: String, default: "" },
    location: { type: String, default: "" },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    skills: { type: [String], default: [] },
    bio:    { type: String,   default: "" },

    /* ── Suspension (admin-imposed) ── */
    isSuspended:      { type: Boolean, default: false },
    suspensionReason: { type: String,  default: "" },

    /* ── Account status (self-deactivation) ──
         "active"   → normal
         "inactive" → self-deactivated, auto-reactivates on next login
    ── */
    status: {
      type:    String,
      enum:    ["active", "inactive"],
      default: "active",
    },

    /* ── Privacy & preferences ── */
    profileVisibility: { type: Boolean, default: true  }, // NGOs can see skills/bio
    autoMatch:         { type: Boolean, default: true  }, // skill-based opp sorting

    /* ── Notification preferences ──
         general  → system alerts, announcements  (all roles)
         activity → applications, opportunities   (volunteer + ngo only)
         chat     → message notifications         (volunteer + ngo only)
    ── */
    notificationPrefs: {
      general:  { type: Boolean, default: true },
      activity: { type: Boolean, default: true },
      chat:     { type: Boolean, default: true },
    },

    /* ── Block list ── */
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  "User",
      },
    ],

    /* ── OTP ── */
    otp:         { type: String,  default: null  },
    otpExpiry:   { type: Date,    default: null  },
    otpAttempts: { type: Number,  default: 0     },
    isVerified:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* ── Hash password before save ── */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);