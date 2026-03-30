const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");

const {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotification
} = require("../controllers/notificationController");

/* GET all notifications for logged-in user */
router.get("/", verifyToken, getNotifications);

/* MARK single notification as read */
router.put("/read/:id", verifyToken, markAsRead);

/* MARK all notifications as read */
router.put("/read-all", verifyToken, markAllRead);

/* DELETE a notification */
router.delete("/:id", verifyToken, deleteNotification);

module.exports = router;