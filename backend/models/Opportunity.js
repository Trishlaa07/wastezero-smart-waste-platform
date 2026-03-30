const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    ngo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    duration: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    image: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },

    /* ── NEW ── */
    volunteersNeeded: {
      type: Number,
      default: 1,
      min: 1,
    },
    applicantCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ── REPORTING ── */
    isReported:  { type: Boolean, default: false },
    reportReason: { type: String,  default: "" },
    reportCount:  { type: Number,  default: 0 },
    isHidden:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);