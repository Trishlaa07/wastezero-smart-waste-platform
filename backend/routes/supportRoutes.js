const express = require("express");
const router = express.Router();

const {
  createMessage,
  getAllMessages,
  replyMessage,
  resolveMessage
} = require("../controllers/supportController");

// USER
router.post("/message", createMessage);

// ADMIN
router.get("/all", getAllMessages);
router.post("/reply/:id", replyMessage);
router.put("/resolve/:id", resolveMessage);

module.exports = router;