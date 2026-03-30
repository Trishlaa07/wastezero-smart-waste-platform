const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    /* One of these will be set depending on report type */
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Opportunity",
      default: null,
    },

    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      default: null,
    },

    /* "opportunity" | "user" */
    reportType: {
      type:    String,
      enum:    ["opportunity", "user"],
      default: "opportunity",
    },

    reason:      { type: String, required: true },
    description: { type: String, default: "" },

    status: {
      type:    String,
      enum:    ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);