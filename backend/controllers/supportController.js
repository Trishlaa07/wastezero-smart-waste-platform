const Support = require("../models/Support");

/* =========================================
   CREATE MESSAGE (USER)
========================================= */
exports.createMessage = async (req, res) => {
  try {
    const { subject, message, user } = req.body;

    const newMsg = await Support.create({
      subject,
      message,
      user,
      status: "pending"
    });

    // 🔥 REALTIME EMIT TO ADMIN
    if (global.io) {
      global.io.to("admin_room").emit("newSupportMessage", newMsg);
    }

    res.status(201).json({
      message: "Message saved",
      data: newMsg
    });

  } catch (err) {
    console.log("❌ CREATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


/* =========================================
   GET ALL MESSAGES (ADMIN)
========================================= */
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Support.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.log("❌ FETCH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


/* =========================================
   REPLY
========================================= */
exports.replyMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const updated = await Support.findByIdAndUpdate(
      id,
      { reply, status: "resolved" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Message not found" });
    }

    // 🔥 REALTIME UPDATE
    if (global.io) {
      global.io.to("admin_room").emit("supportUpdated", updated);
    }

    res.json({ message: "Reply added", data: updated });

  } catch (err) {
    console.log("❌ REPLY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


/* =========================================
   RESOLVE
========================================= */
exports.resolveMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Support.findByIdAndUpdate(
      id,
      { status: "resolved" },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Message not found" });
    }

    // 🔥 REALTIME UPDATE
    if (global.io) {
      global.io.to("admin_room").emit("supportUpdated", updated);
    }

    res.json({ message: "Resolved", data: updated });

  } catch (err) {
    console.log("❌ RESOLVE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};