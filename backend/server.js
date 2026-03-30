require("dotenv").config();

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const http     = require("http");

/* ── ROUTE IMPORTS ── */
const authRoutes         = require("./routes/authRoutes");
const protectedRoutes    = require("./routes/protectedRoutes");
const userRoutes         = require("./routes/userRoutes");
const opportunityRoutes  = require("./routes/opportunityRoutes");
const messageRoutes      = require("./routes/messageRoutes");
const adminRoutes        = require("./routes/adminRoutes");
const applicationRoutes  = require("./routes/applicationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes       = require("./routes/reportRoutes");

const { markMessagesReadSocket } = require("./controllers/messageController");

const app    = express();
const server = http.createServer(app);

/* ── MIDDLEWARE ── */
app.use(cors({
  origin:      "http://localhost:5173",
  methods:     ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ── SOCKET.IO ── */
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin:  "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

global.io = io;

/* Track online users: Map<userId, socketId> */
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* ── USER JOINS THEIR ROOM ── */
  socket.on("join", (userId) => {
    if (!userId) {
      console.log("⚠️  join called without userId");
      return;
    }

    const roomId = userId.toString();

    /* Leave any previous room this socket was in */
    socket.rooms.forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    socket.userId = roomId;

    onlineUsers.set(roomId, socket.id);

    /* Broadcast updated online list to everyone */
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    /* Also send the current list directly to this socket right away —
       so the Messages page gets accurate status without waiting for
       someone else to connect/disconnect */
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

    console.log(`✅ User ${roomId} joined room. Online: ${onlineUsers.size}`);
  });

  /* ── GET ONLINE USERS (called on Messages page mount) ── */
  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  /* ── MARK READ (receiver has chat open, new message arrived) ──
     Updates DB and fires messagesRead back to sender so ticks turn blue
     without the sender needing to re-open the chat.                    */
  socket.on("markRead", async ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    await markMessagesReadSocket(senderId, receiverId);
  });

  /* ── TYPING ── */
  socket.on("typing", ({ sender, receiver }) => {
    if (receiver) {
      io.to(receiver.toString()).emit("typing", { sender });
    }
  });

  /* ── DISCONNECT ── */
  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log(`❌ User ${socket.userId} disconnected. Online: ${onlineUsers.size}`);
    } else {
      console.log("❌ Socket disconnected (no userId):", socket.id);
    }
  });
});

/* ── ROUTES ── */
app.use("/api/auth",          authRoutes);
app.use("/api/protected",     protectedRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/applications",  applicationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages",      messageRoutes);
app.use("/api/reports",       reportRoutes);

app.get("/", (req, res) => res.send("API Running..."));

/* ── DATABASE ── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

/* ── START ── */
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));