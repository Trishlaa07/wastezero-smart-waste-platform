const mongoose = require("mongoose");
const Message  = require("../models/Message");
const User     = require("../models/User");
const { createNotification } = require("./notificationController");

/* ==============================
   SEND MESSAGE
============================== */
const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, opportunityId } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ message: "Receiver and message required" });
    }

    /* Check if either user has blocked the other */
    const [sender, receiver] = await Promise.all([
      User.findById(req.user.id).select("blockedUsers"),
      User.findById(receiverId).select("blockedUsers"),
    ]);

    const senderBlocked   = sender?.blockedUsers?.includes(receiverId);
    const receiverBlocked = receiver?.blockedUsers?.map(id => id.toString())
      .includes(req.user.id.toString());

    if (senderBlocked) {
      return res.status(403).json({
        message: "You have blocked this user. Unblock them to send messages."
      });
    }

    if (receiverBlocked) {
      return res.status(403).json({
        message: "You cannot message this user."
      });
    }

    const newMessage = new Message({
      sender:      req.user.id,
      receiver:    receiverId,
      message,
      opportunity: opportunityId || null
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender",   "name")
      .populate("receiver", "name");

    const senderName = populatedMessage.sender?.name || "Someone";

    // Only create a notification if the receiver does NOT have this chat open.
    // When receiver opens a chat they join room "chat:{userId}", so we check that.
    const receiverHasChatOpen = global.io
      ? global.io.sockets.adapter.rooms.has(`chat:${req.user.id}:${receiverId}`)
        || global.io.sockets.adapter.rooms.has(`chat:${receiverId}:${req.user.id}`)
      : false;

    if (!receiverHasChatOpen) {
      await createNotification(
        receiverId,
        `${senderName} sent you a message`,
        "message",
        newMessage._id,
        "Message"
      );
    }

    if (global.io) {
      global.io
        .to(receiverId.toString())
        .emit("receiveMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);

  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

/* ==============================
   GET CHAT HISTORY
============================== */
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId,      receiver: req.user.id }
      ]
    })
      .populate("sender",   "name")
      .populate("receiver", "name")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: userId, receiver: req.user.id, isRead: false },
      { isRead: true }
    );

    if (global.io) {
      // Tell the sender their messages were read → turns ticks blue
      global.io
        .to(userId.toString())
        .emit("messagesRead", { by: req.user.id });

      // Tell the current user's OTHER tabs/windows to clear notification badge
      global.io
        .to(req.user.id.toString())
        .emit("notificationsCleared", { conversationWith: userId });
    }

    res.json(messages);

  } catch (err) {
    console.error("Chat History Error:", err);
    res.status(500).json({ message: "Failed to load messages", error: err.message });
  }
};

/* ==============================
   GET CONVERSATIONS
============================== */
const getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $addFields: {
          chatUser: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"]
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id:         "$chatUser",
          lastMessage: { $first: "$message" },
          createdAt:   { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
                    { $eq: ["$isRead", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from:         "users",
          localField:   "_id",
          foreignField: "_id",
          as:           "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id:         1,
          lastMessage: 1,
          createdAt:   1,
          unreadCount: 1,
          name:        "$user.name",
          role:        "$user.role",
        }
      }
    ]);

    res.json(conversations);

  } catch (err) {
    console.error("Conversation Error:", err);
    res.status(500).json({ message: "Failed to load conversations", error: err.message });
  }
};

/* ==============================
   GET UNREAD COUNT
============================== */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      isRead:   false
    });
    res.json({ count });
  } catch (err) {
    console.error("Unread Count Error:", err);
    res.status(500).json({ message: "Failed to get unread count", error: err.message });
  }
};

/* ==============================
   BLOCK USER
============================== */
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { blockedUsers: userId }
    });

    res.json({ message: "User blocked" });

  } catch (err) {
    console.error("Block User Error:", err);
    res.status(500).json({ message: "Failed to block user" });
  }
};

/* ==============================
   UNBLOCK USER
============================== */
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { blockedUsers: userId }
    });

    res.json({ message: "User unblocked" });

  } catch (err) {
    console.error("Unblock User Error:", err);
    res.status(500).json({ message: "Failed to unblock user" });
  }
};

/* ==============================
   GET BLOCK STATUS
============================== */
const getBlockStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const me = await User.findById(req.user.id).select("blockedUsers");
    const them = await User.findById(userId).select("blockedUsers");

    const iBlockedThem = me?.blockedUsers
      ?.map(id => id.toString())
      .includes(userId) || false;

    const theyBlockedMe = them?.blockedUsers
      ?.map(id => id.toString())
      .includes(req.user.id.toString()) || false;

    res.json({ iBlockedThem, theyBlockedMe });

  } catch (err) {
    console.error("Block Status Error:", err);
    res.status(500).json({ message: "Failed to get block status" });
  }
};

/* ==============================
   GET USER PROFILE FOR CHAT
   — Returns basic profile info plus accepted opportunities linking the two users.

   Auto-detects field names from the schema so it works regardless of whether
   your models use ngo/createdBy/organization and applicant/volunteer/userId.
============================== */
const getChatUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user.id;

    const myObjId    = new mongoose.Types.ObjectId(myId);
    const theirObjId = new mongoose.Types.ObjectId(userId);

    // Basic profile (no phone)
    const user = await User.findById(userId)
      .select("name email role skills location bio");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let Application, Opportunity;
    try {
      Application = require("../models/Application");
      Opportunity = require("../models/Opportunity");
    } catch {
      return res.json({ ...user.toObject(), acceptedOpportunities: [] });
    }

    /* ── Auto-detect field names from schema paths ── */

    // Detect which field on Opportunity references the NGO/owner
    const oppPaths   = Object.keys(Opportunity.schema.paths);
    const ngoField   = ["ngo", "createdBy", "organization", "postedBy", "owner"]
      .find(f => oppPaths.includes(f)) || "ngo";

    // Detect which field on Application references the opportunity
    const appPaths   = Object.keys(Application.schema.paths);
    const oppField   = ["opportunity", "opportunityId", "post", "listing"]
      .find(f => appPaths.includes(f)) || "opportunity";

    // Detect which field on Application references the volunteer/applicant
    const volField   = ["applicant", "volunteer", "userId", "user", "applicantId"]
      .find(f => appPaths.includes(f)) || "applicant";

    // Detect status field and accepted value
    const statusField = appPaths.includes("status") ? "status" : null;

    console.log(`[ChatProfile] schema fields — opp.${ngoField}, app.${oppField}, app.${volField}`);

    /* ── Find opportunity IDs owned by each user ── */
    const [myOpps, theirOpps] = await Promise.all([
      Opportunity.find({ [ngoField]: myObjId }).select("_id title description location date").lean(),
      Opportunity.find({ [ngoField]: theirObjId }).select("_id title description location date").lean(),
    ]);

    const myOppIds    = myOpps.map(o => o._id);
    const theirOppIds = theirOpps.map(o => o._id);

    console.log(`[ChatProfile] myOpps: ${myOppIds.length}, theirOpps: ${theirOppIds.length}`);

    /* ── Build status filter ── */
    const statusFilter = statusField
      ? { [statusField]: { $in: ["accepted", "Accepted", "approved", "Approved"] } }
      : {};

    /* ── Leg A: I am the NGO — find accepted apps by them on my opps ── */
    /* ── Leg B: They are the NGO — find my accepted apps on their opps ── */
    const [legA, legB] = await Promise.all([
      myOppIds.length > 0
        ? Application.find({
            ...statusFilter,
            [volField]: theirObjId,
            [oppField]: { $in: myOppIds },
          }).lean()
        : Promise.resolve([]),

      theirOppIds.length > 0
        ? Application.find({
            ...statusFilter,
            [volField]: myObjId,
            [oppField]: { $in: theirOppIds },
          }).lean()
        : Promise.resolve([]),
    ]);

    console.log(`[ChatProfile] legA apps: ${legA.length}, legB apps: ${legB.length}`);

    /* ── Merge and map — look up opp details from what we already fetched ── */
    const allOpps = [...myOpps, ...theirOpps];
    const oppMap  = Object.fromEntries(allOpps.map(o => [o._id.toString(), o]));

    const combined = [...legA, ...legB];

    const acceptedOpportunities = combined.map(app => {
      const oppId  = app[oppField]?.toString();
      const oppDoc = oppMap[oppId] || {};
      return {
        _id:         oppDoc._id,
        title:       oppDoc.title,
        description: oppDoc.description,
        location:    oppDoc.location,
        date:        oppDoc.date,
        appliedAt:   app.createdAt,
      };
    }).filter(o => o.title); // drop any with no matched opp

    res.json({ ...user.toObject(), acceptedOpportunities });

  } catch (err) {
    console.error("Chat Profile Error:", err);
    res.status(500).json({ message: "Failed to get user profile" });
  }
};

/* ==============================
   MARK MESSAGES READ (called from socket, not HTTP)
   Used when receiver has chat open and new message arrives —
   no HTTP request is made so we handle read marking via socket.
============================== */
const markMessagesReadSocket = async (senderId, receiverId) => {
  try {
    await Message.updateMany(
      { sender: senderId, receiver: receiverId, isRead: false },
      { isRead: true }
    );
    // Emit blue tick back to the sender
    if (global.io) {
      global.io
        .to(senderId.toString())
        .emit("messagesRead", { by: receiverId });
    }
  } catch (err) {
    console.error("markMessagesReadSocket error:", err);
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  getConversations,
  getUnreadCount,
  blockUser,
  unblockUser,
  getBlockStatus,
  getChatUserProfile,
  markMessagesReadSocket,
};