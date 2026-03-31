const mongoose = require("mongoose");

const supportSchema = new mongoose.Schema({
  subject: String,
  message: String,
  user: String,

  reply: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["pending", "resolved"],
    default: "pending"
  }

}, { timestamps: true });

module.exports = mongoose.model("Support", supportSchema);