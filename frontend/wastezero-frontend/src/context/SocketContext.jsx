import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

const API = import.meta.env.VITE_API_URL ?? "https://wastezero-smart-waste-platform-backend-4wcw.onrender.com";

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [socket, setSocket]   = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    /* ── Read user safely ── */
    let user = null;
    try { user = JSON.parse(localStorage.getItem("user")); } catch {}

    /* Support both _id and id — whichever login stored */
    const userId = user?._id || user?.id;

    if (!userId) {
      console.log("⚠️  SocketContext: no userId found, skipping socket init");
      return;
    }

    console.log("🔌 Initialising socket for user:", userId);

    const s = io(API, {
      transports:          ["websocket"],
      reconnection:        true,
      reconnectionAttempts: Infinity,
      reconnectionDelay:   1000,
      reconnectionDelayMax: 5000,
    });

    /* ── Join room immediately on every connect / reconnect ── */
    const joinRoom = () => {
      console.log("📡 Emitting join for:", userId);
      s.emit("join", userId);
      setIsReady(true);
    };

    s.on("connect",   joinRoom);
    s.on("reconnect", joinRoom);   // socket.io v4 fires this too

    s.on("connect_error", (err) => {
      console.log("❌ Socket connect error:", err.message);
      setIsReady(false);
    });

    s.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setIsReady(false);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      console.log("🧹 Cleaning up socket");
      s.off("connect",   joinRoom);
      s.off("reconnect", joinRoom);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsReady(false);
    };
  }, []); // runs once on mount — intentional

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
