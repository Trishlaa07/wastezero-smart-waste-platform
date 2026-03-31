const express = require("express");
const Pickup = require("../models/Pickup");
const { verifyToken } = require("../middleware/authMiddleware");

/* Pass `io` from server.js so we can emit real-time events */
module.exports = (io) => {
  const router = express.Router();

  // Helper: works whether JWT was signed with _id or id
  const getUserId = (req) => req.user._id || req.user.id;

  // ──────────────────────────────────────────────────────────────
  // POST /api/pickups
  // Volunteer schedules a new pickup
  // ──────────────────────────────────────────────────────────────
  router.post("/", verifyToken, async (req, res) => {
    try {
      const {
        opportunity,
        address,
        city,
        pickupDate,
        timeSlot,
        wasteType,
        additionalNotes,
      } = req.body;

      if (!address || !city || !pickupDate || !timeSlot || !wasteType) {
        return res.status(400).json({ message: "Missing required fields." });
      }

      const newPickup = new Pickup({
        volunteer:       getUserId(req),   // ← fixed
        opportunity:     opportunity || null,
        address,
        city,
        pickupDate,
        timeSlot,
        wasteType,
        additionalNotes: additionalNotes || "",
      });

      await newPickup.save();
      await newPickup.populate("volunteer", "name phone email");

      io.emit("newPickup", newPickup);

      res.status(201).json(newPickup);
    } catch (err) {
      console.error("POST /api/pickups error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/pickups
  // Returns the logged-in volunteer's own pickups
  // ──────────────────────────────────────────────────────────────
  router.get("/", verifyToken, async (req, res) => {
    try {
      const pickups = await Pickup.find({ volunteer: getUserId(req) })  // ← fixed
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (err) {
      console.error("GET /api/pickups error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/pickups/volunteer  (alias)
  // ──────────────────────────────────────────────────────────────
  router.get("/volunteer", verifyToken, async (req, res) => {
    try {
      const pickups = await Pickup.find({ volunteer: getUserId(req) })  // ← fixed
        .sort({ createdAt: -1 });
      res.json(pickups);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/pickups/ngo
  // NGO sees all pickups with volunteer details
  // ──────────────────────────────────────────────────────────────
  router.get("/ngo", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "ngo" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
      }

      const pickups = await Pickup.find({})
        .populate("volunteer", "name phone email")
        .sort({ createdAt: -1 });

      res.json(pickups);
    } catch (err) {
      console.error("GET /api/pickups/ngo error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // PUT /api/pickups/:id/status
  // NGO updates status / assigns agent / records weight
  // ──────────────────────────────────────────────────────────────
  router.put("/:id/status", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "ngo" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied." });
      }

      const { status, actualWeight, assignedTo } = req.body;

      const VALID_STATUSES = ["pending", "accepted", "in-transit", "completed", "cancelled"];
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }

      const pickup = await Pickup.findById(req.params.id);
      if (!pickup) return res.status(404).json({ message: "Pickup not found." });

      if (status !== undefined)       pickup.status       = status;
      if (actualWeight !== undefined) pickup.actualWeight = actualWeight;
      if (assignedTo !== undefined)   pickup.assignedTo   = assignedTo;

      await pickup.save();
      await pickup.populate("volunteer", "name phone email");

      io.emit("pickupUpdated", pickup);

      res.json(pickup);
    } catch (err) {
      console.error("PUT /api/pickups/:id/status error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // DELETE /api/pickups/:id
  // Volunteer cancels their own pending pickup
  // ──────────────────────────────────────────────────────────────
  router.delete("/:id", verifyToken, async (req, res) => {
    try {
      const pickup = await Pickup.findById(req.params.id);
      if (!pickup) return res.status(404).json({ message: "Pickup not found." });

      if (pickup.volunteer.toString() !== getUserId(req).toString()) {  // ← fixed
        return res.status(403).json({ message: "Not authorised." });
      }
      if (pickup.status !== "pending") {
        return res.status(400).json({ message: "Only pending pickups can be cancelled." });
      }

      pickup.status = "cancelled";
      await pickup.save();

      io.emit("pickupUpdated", pickup);

      res.json({ message: "Pickup cancelled.", pickup });
    } catch (err) {
      console.error("DELETE /api/pickups/:id error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  return router;
};