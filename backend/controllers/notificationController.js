const Notification = require("../models/Notification");

/* =========================================
   CREATE NOTIFICATION (USED BY OTHER APIS)
========================================= */
exports.createNotification = async (
  userId,
  message,
  type       = "general",
  relatedId  = null,
  relatedModel = null
) => {
  try {
    const notification = await Notification.create({
      user:         userId,
      message,
      type,
      relatedId:    relatedId    || undefined,
      relatedModel: relatedModel || undefined
    });

    if (global.io) {
      global.io
        .to(userId.toString())
        .emit("newNotification", notification);
    }

    return notification;

  } catch (error) {
    console.log("Notification creation error:", error);
  }
};

/* =========================================
   GET USER NOTIFICATIONS
========================================= */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);           // never send unbounded payloads

    res.status(200).json(notifications);

  } catch (error) {
    console.log("Fetch notification error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

/* =========================================
   MARK SINGLE NOTIFICATION AS READ
========================================= */
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Marked as read", notification });

  } catch (error) {
    console.log("Mark read error:", error);
    res.status(500).json({ message: "Failed to mark notification" });
  }
};

/* =========================================
   MARK ALL NOTIFICATIONS AS READ
========================================= */
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });

  } catch (error) {
    console.log("Mark all read error:", error);
    res.status(500).json({ message: "Failed to mark all notifications" });
  }
};

/* =========================================
   DELETE NOTIFICATION
========================================= */
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id:  req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted" });

  } catch (error) {
    console.log("Delete notification error:", error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
};