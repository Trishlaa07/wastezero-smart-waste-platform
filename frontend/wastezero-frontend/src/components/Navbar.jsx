import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/Navbar.css";
import { useSocket } from "../context/SocketContext";

import {
  Bell, Search, ChevronDown,
  LogOut, Settings, User, MessageCircle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const ROUTE_LABELS = {
  "/volunteer-dashboard": "Volunteer Dashboard",
  "/ngo-dashboard":       "NGO Dashboard",
  "/admin-dashboard":     "Admin Dashboard",
  "/opportunities":       "Opportunities",
  "/create-opportunity":  "Create Opportunity",
  "/applications":        "Applications",
  "/messages":            "Messages",
  "/profile":             "My Profile",
  "/settings":            "Settings",
  "/users":               "Monitor Users",
  "/reports":             "Reports & Analytics",
  "/moderation":          "Moderation",
  "/platform-health":     "Platform Control",
  "/impact":              "Waste Statistics",
  "/schedule":            "Schedule Pickup",
  "/notifications":       "Notifications",
};

// ✅ "report" is NOT excluded — admin must receive report/chat notifications
// Only truly irrelevant types for admin are excluded
const ADMIN_EXCLUDED_TYPES = ["opportunity", "new_user", "message"];

function Navbar() {
  const [dropdownOpen, setDropdownOpen]           = useState(false);
  const [showLogoutModal, setShowLogoutModal]     = useState(false);

  /* Bell */
  const [notifications, setNotifications]         = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  /* Messages dropdown */
  const [recentMessages, setRecentMessages]       = useState([]);
  const [showMessages, setShowMessages]           = useState(false);
  const [unreadMessages, setUnreadMessages]       = useState(0);

  const dropdownRef = useRef(null);
  const notifyRef   = useRef(null);
  const messageRef  = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const socket   = useSocket();

  const token = localStorage.getItem("token");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  const isAdmin     = user?.role === "admin";
  const firstName   = user?.name?.split(" ")[0] || "User";
  const userInitial = firstName.charAt(0).toUpperCase();

  const unreadBellCount = notifications.filter(n => !n.isRead).length;

  /* ── Time ago ── */
  const timeAgo = (date) => {
    if (!date) return "";
    const diff = Date.now() - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  /* ── Filter helper: strip types admin should not see ── */
  const filterForRole = useCallback((list) => {
    if (isAdmin) {
      // Admin sees "report" and all other types NOT in the excluded list
      return list.filter(n => !ADMIN_EXCLUDED_TYPES.includes(n.type));
    }
    // Non-admin: only exclude "message" (handled via messages dropdown)
    return list.filter(n => n.type !== "message");
  }, [isAdmin]);

  /* ── Fetch bell notifications ── */
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(filterForRole(res.data));
    } catch (e) {
      console.log("Fetch notifications error:", e);
    }
  }, [token, filterForRole]);

  /* ── Fetch recent conversations for message dropdown ── */
  const fetchRecentMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentMessages(res.data);
      const total = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setUnreadMessages(total);
    } catch (e) {
      console.log("Fetch recent messages error:", e);
    }
  }, [token]);

  /* ── Initial fetch ── */
  useEffect(() => {
    fetchNotifications();
    fetchRecentMessages();
  }, [fetchNotifications, fetchRecentMessages]);

  /* ── Real-time: new notification ── */
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (n) => {
      if (n.type === "message") {
        // Admin does not get message notifications
        if (isAdmin) return;
        if (location.pathname !== "/messages") {
          setUnreadMessages(prev => prev + 1);
        }
        fetchRecentMessages();
      } else {
        // Drop excluded types for admin in real-time too
        // "report" is NOT in ADMIN_EXCLUDED_TYPES so it passes through
        if (isAdmin && ADMIN_EXCLUDED_TYPES.includes(n.type)) return;

        setNotifications(prev => {
          if (prev.find(x => x._id === n._id)) return prev;
          return [n, ...prev];
        });
      }
    };

    socket.on("newNotification", handleNewNotification);
    return () => socket.off("newNotification", handleNewNotification);
  }, [socket, location.pathname, fetchRecentMessages, isAdmin]);

  /* ── Real-time: incoming message (non-admin only) ── */
  useEffect(() => {
    if (!socket || isAdmin) return;

    const handleReceiveMessage = (newMsg) => {
      if (location.pathname !== "/messages") {
        setUnreadMessages(prev => prev + 1);
      }

      const senderId =
        typeof newMsg.sender === "object" ? newMsg.sender._id : newMsg.sender;
      const senderName =
        typeof newMsg.sender === "object" ? newMsg.sender.name : null;

      setRecentMessages(prev => {
        const exists = prev.find(c => c._id === senderId);

        if (!exists && senderName) {
          return [
            {
              _id: senderId,
              name: senderName,
              lastMessage: newMsg.message,
              unreadCount: location.pathname !== "/messages" ? 1 : 0,
              createdAt: newMsg.createdAt,
            },
            ...prev,
          ];
        }

        return prev.map(c => {
          if (c._id === senderId) {
            return {
              ...c,
              lastMessage: newMsg.message,
              createdAt: newMsg.createdAt,
              unreadCount:
                location.pathname !== "/messages"
                  ? (c.unreadCount || 0) + 1
                  : 0,
            };
          }
          return c;
        });
      });
    };

    socket.on("receiveMessage", handleReceiveMessage);
    return () => socket.off("receiveMessage", handleReceiveMessage);
  }, [socket, location.pathname, isAdmin]);

  /* ── Clear message badge when on /messages ── */
  useEffect(() => {
    if (location.pathname === "/messages") {
      setUnreadMessages(0);
      setRecentMessages(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
    }
  }, [location.pathname]);

  /* ── Bell click — just toggle dropdown, DO NOT mark as read ── */
  const handleBellClick = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowMessages(false);
    setDropdownOpen(false);
  };

  /* ── Mark ALL as read — only when user explicitly clicks "Mark all read" ── */
  const handleMarkAllRead = async () => {
    try {
      await axios.put(
        `${API}/api/notifications/read-all`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.log("Mark all read error:", e);
    }
  };

  /* ── Message icon click — toggle dropdown ── */
  const handleMessageClick = () => {
    const next = !showMessages;
    setShowMessages(next);
    setShowNotifications(false);
    setDropdownOpen(false);
  };

  /* ── Click a conversation in message dropdown ── */
  const handleMessagePreviewClick = (chat) => {
    setShowMessages(false);
    setRecentMessages(prev =>
      prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c)
    );
    navigate("/messages", {
      state: {
        userId:   chat._id,
        userName: chat.name,
      }
    });
  };

  /* ── Mark single bell notification as read ── */
  const markAsRead = async (id) => {
    try {
      await axios.put(
        `${API}/api/notifications/read/${id}`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(p =>
        p.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (e) {
      console.log("Mark read error:", e);
    }
  };

  /* ── Navigate on bell notification click — marks only that item as read ── */
  const handleNotificationClick = (n) => {
    markAsRead(n._id);
    setShowNotifications(false);

    switch (n.type) {
      case "opportunity":
        navigate(n.relatedId ? `/opportunity/${n.relatedId}` : "/opportunities");
        break;

      case "application":
        if (user?.role === "ngo") {
          navigate("/applications");
        } else {
          navigate(n.relatedId ? `/opportunity/${n.relatedId}` : "/applications");
        }
        break;

      case "post_deleted":
        navigate("/opportunities");
        break;

      case "report":
        // ✅ If relatedId is a User (user report) → go to /users and highlight that user
        // If relatedId is an Opportunity → go to /moderation
        if (n.relatedModel === "User" && n.relatedId) {
          navigate("/users", { state: { highlightUserId: n.relatedId } });
        } else {
          navigate("/moderation");
        }
        break;

      case "new_user":
        navigate("/users");
        break;
      
      case "support":
        navigate("/admin/support");
        break;

      default:
        navigate("/");
    }
  };

  /* ── Outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
      if (notifyRef.current && !notifyRef.current.contains(e.target))
        setShowNotifications(false);
      if (messageRef.current && !messageRef.current.contains(e.target))
        setShowMessages(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Logout ── */
  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setShowLogoutModal(false);
    navigate("/login");
  };

  return (
    <>
      <div className="navbar">

        {/* SEARCH */}
        <div className="navbar-search">
          <Search size={15} />
          <input type="text" placeholder="Search pickups, opportunities..." />
        </div>

        <div className="navbar-spacer" />

        {/* RIGHT */}
        <div className="navbar-right">

          {/* ── MESSAGES ICON + DROPDOWN — hidden for admin ── */}
          {!isAdmin && (
            <div className="nav-icon-wrapper" ref={messageRef}>
              <button
                className="nav-icon-btn"
                title="Messages"
                onClick={handleMessageClick}
              >
                <MessageCircle size={16} />
                {unreadMessages > 0 && (
                  <span className="notification-badge">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </button>

              {showMessages && (
                <div className="message-dropdown">
                  <div className="message-dropdown-header">
                    <h4>Messages</h4>
                    <Link
                      to="/messages"
                      className="message-view-all"
                      onClick={() => setShowMessages(false)}
                    >
                      View all
                    </Link>
                  </div>

                  <div className="message-scroll-body">
                    {recentMessages.length === 0 ? (
                      <p className="no-messages">No conversations yet</p>
                    ) : (
                      recentMessages.map(chat => (
                        <div
                          key={chat._id}
                          className={`message-preview-item ${
                            chat.unreadCount > 0 ? "unread-msg" : ""
                          }`}
                          onClick={() => handleMessagePreviewClick(chat)}
                        >
                          <div className="msg-avatar">
                            {chat.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>

                          <div className="msg-preview-content">
                            <p className="msg-preview-name">{chat.name}</p>
                            <p className="msg-preview-text">
                              {chat.lastMessage || "No messages yet"}
                            </p>
                          </div>

                          <div className="msg-preview-meta">
                            <span className="msg-preview-time">
                              {timeAgo(chat.createdAt)}
                            </span>
                            {chat.unreadCount > 0 && (
                              <div className="msg-unread-dot" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BELL + DROPDOWN ── */}
          <div className="notification-wrapper" ref={notifyRef}>
            <button
              className="nav-icon-btn"
              onClick={handleBellClick}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadBellCount > 0 && (
                <span className="notification-badge">
                  {unreadBellCount > 99 ? "99+" : unreadBellCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">

                <div className="notif-header">
                  <h4>Notifications</h4>
                  <span
                    className="notif-clear"
                    onClick={handleMarkAllRead}
                  >
                    Mark all read
                  </span>
                </div>

                <div className="notif-scroll-body">
                  {notifications.length === 0 ? (
                    <p className="no-notify">You're all caught up</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        className={`notification-item ${n.isRead ? "" : "unread"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationClick(n);
                        }}
                      >
                        <div className={`notif-dot ${n.isRead ? "read" : ""}`} />
                        <div className="notif-content">
                          <p>{n.message}</p>
                          <span>{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

          <div className="navbar-divider" />

          {/* ── PROFILE DROPDOWN ── */}
          <div
            className="profile-chip"
            ref={dropdownRef}
            onClick={() => {
              setDropdownOpen(o => !o);
              setShowNotifications(false);
              setShowMessages(false);
            }}
          >
            <div className="profile-avatar">
              {user?.profileImage
                ? <img src={`${API}/uploads/${user.profileImage}`} alt="profile" />
                : <span>{userInitial}</span>
              }
            </div>

            <ChevronDown size={14} className="profile-chevron" />

            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">{userInitial}</div>
                  <div>
                    <p className="dropdown-name">{user?.name}</p>
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <Link to="/profile" className="dropdown-item">
                  <User size={14} /><span>My Profile</span>
                </Link>
                <Link to="/settings" className="dropdown-item">
                  <Settings size={14} /><span>Settings</span>
                </Link>
                <div className="dropdown-divider" />
                <div
                  className="dropdown-item logout"
                  onClick={() => setShowLogoutModal(true)}
                >
                  <LogOut size={14} /><span>Logout</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <LogOut size={22} />
            </div>
            <h3>Signing out?</h3>
            <p>You'll need to log back in to access your account.</p>
            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmLogout}>
                Yes, logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;