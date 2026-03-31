const mongoose = require("mongoose");

const pickupSchema = new mongoose.Schema(
  {
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // opportunity is optional — not all pickups are linked to one
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      default: null,
    },
    address: { type: String, required: true },
    city:    { type: String, required: true },
    pickupDate: { type: String, required: true },
    timeSlot:   { type: String, required: true },
    wasteType:  { type: String, required: true }, // stored as comma-separated string
    additionalNotes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "in-transit", "completed", "cancelled"],
      default: "pending",
    },
    actualWeight: { type: Number, default: 0 },
    assignedTo:   { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pickup", pickupSchema);