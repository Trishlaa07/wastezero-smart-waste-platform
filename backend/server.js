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
const pickupRoutes       = require("./routes/pickupRoutes");
const supportRoutes      = require("./routes/supportRoutes");

const { markMessagesReadSocket } = require("./controllers/messageController");

const app    = express();
const server = http.createServer(app);

/* ── ✅ CORS (FIXED) ── */
const allowedOrigins = [
  "http://localhost:5173",
  "https://wastezero-smart-waste-platform-frontend-c14z.onrender.com"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ CORS Not Allowed"));
    }
  },
  credentials: true
}));

/* ── MIDDLEWARE ── */
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* ── SOCKET.IO ── */
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;

    const roomId = userId.toString();

    socket.rooms.forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(roomId);
    socket.userId = roomId;
    onlineUsers.set(roomId, socket.id);

    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

    console.log(`✅ User ${roomId} joined`);
  });

  socket.on("getOnlineUsers", () => {
    socket.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("markRead", async ({ senderId, receiverId }) => {
    if (!senderId || !receiverId) return;
    await markMessagesReadSocket(senderId, receiverId);
  });

  socket.on("typing", ({ sender, receiver }) => {
    if (receiver) {
      io.to(receiver.toString()).emit("typing", { sender });
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log(`❌ User ${socket.userId} disconnected`);
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
app.use("/api/pickups",       pickupRoutes(io));
app.use("/api/support",       supportRoutes);

/* ── TEST ROUTE ── */
app.get("/", (req, res) => {
  res.send("✅ API Running...");
});

/* ── DATABASE (IMPROVED) ── */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
  console.error("❌ MongoDB Error:", err.message);
  process.exit(1); // stop app if DB fails
});

/* ── START SERVER ── */
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
