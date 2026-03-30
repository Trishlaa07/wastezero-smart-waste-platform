const express    = require("express");
const router     = express.Router();
const mc         = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/send",                  verifyToken, mc.sendMessage);
router.get("/chat/:userId",           verifyToken, mc.getChatHistory);
router.get("/conversations",          verifyToken, mc.getConversations);
router.get("/unread-count",           verifyToken, mc.getUnreadCount);
router.post("/block/:userId",         verifyToken, mc.blockUser);
router.post("/unblock/:userId",       verifyToken, mc.unblockUser);
router.get("/block-status/:userId",   verifyToken, mc.getBlockStatus);
router.get("/profile/:userId",        verifyToken, mc.getChatUserProfile);

module.exports = router;