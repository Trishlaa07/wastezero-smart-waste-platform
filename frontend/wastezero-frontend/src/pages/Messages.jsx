import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
import {
  Search, MoreVertical, X,
  MapPin, Award, ShieldOff, Flag,
  ChevronLeft, Send, Shield, Briefcase, Calendar,
  CheckCircle, AlertCircle
} from "lucide-react";
import "../styles/messages.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function Messages() {
  const location = useLocation();
  const socket   = useSocket();
  const token    = localStorage.getItem("token");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  /* State */
  const [chats,            setChats]            = useState([]);
  const [messages,         setMessages]         = useState([]);
  const [selectedUser,     setSelectedUser]     = useState(null);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [selectedOpp,      setSelectedOpp]      = useState(null);
  const [text,             setText]             = useState("");
  const [typingUser,       setTypingUser]       = useState(false);
  const [search,           setSearch]           = useState("");
  const [onlineUsers,      setOnlineUsers]      = useState([]);

  /* Profile panel */
  const [showProfile,    setShowProfile]    = useState(false);
  const [chatProfile,    setChatProfile]    = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  /* Block state */
  const [iBlockedThem,  setIBlockedThem]  = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [showMenu,      setShowMenu]      = useState(false);

  /* Report modal */
  const [showReport,      setShowReport]      = useState(false);
  const [reportReason,    setReportReason]    = useState("");
  const [reportSuccess,   setReportSuccess]   = useState(false);
  const [reportError,     setReportError]     = useState("");       // ✅ inline error
  const [reportSubmitting, setReportSubmitting] = useState(false);  // ✅ loading state

  /* Mobile */
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef  = useRef(null);
  const typingTimeout   = useRef(null);
  const selectedUserRef = useRef(null);
  const menuRef         = useRef(null);
  const profilePanelRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  /* Auto scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* Close profile panel on outside click */
  useEffect(() => {
    if (!showProfile) return;
    let handler;
    const timer = setTimeout(() => {
      handler = (e) => {
        if (profilePanelRef.current && !profilePanelRef.current.contains(e.target)) {
          setShowProfile(false);
        }
      };
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      if (handler) document.removeEventListener("mousedown", handler);
    };
  }, [showProfile]);

  /* Socket events */
  useEffect(() => {
    if (!socket) return;

    socket.emit("getOnlineUsers");

    const handleOnlineUsers = (users) => setOnlineUsers(users);

    const handleReceiveMessage = (newMsg) => {
      const senderId =
        typeof newMsg.sender === "object" ? newMsg.sender._id : newMsg.sender;

      if (senderId === selectedUserRef.current) {
        setMessages(prev => [...prev, newMsg]);
        socket.emit("markRead", {
          senderId,
          receiverId: user?._id || user?.id,
        });
        setChats(prev =>
          prev.map(c => c._id === senderId ? { ...c, unreadCount: 0 } : c)
        );
      } else {
        setChats(prev => {
          const exists = prev.find(c => c._id === senderId);
          if (!exists) {
            return [{
              _id: senderId,
              name: newMsg.sender?.name || "Unknown",
              lastMessage: newMsg.message,
              unreadCount: 1,
              createdAt: newMsg.createdAt,
            }, ...prev];
          }
          return prev.map(c => {
            if (c._id === senderId) {
              return {
                ...c,
                lastMessage: newMsg.message,
                createdAt: newMsg.createdAt,
                unreadCount: (c.unreadCount || 0) + 1,
              };
            }
            return c;
          });
        });
      }
    };

    const handleTyping = (data) => {
      if (data.sender === selectedUserRef.current) {
        setTypingUser(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(false), 2000);
      }
    };

    const handleMessagesRead = (data) => {
      setMessages(prev => prev.map(m => {
        const senderId = typeof m.sender === "object" ? m.sender._id : m.sender;
        const isMine   = senderId === user?._id || senderId === user?.id;
        return isMine ? { ...m, isRead: true } : m;
      }));
      if (data?.by) {
        setChats(prev =>
          prev.map(c => c._id === data.by ? { ...c, unreadCount: 0 } : c)
        );
      }
    };

    const handleNotificationsCleared = () => {
      window.dispatchEvent(new CustomEvent("refreshNotifications"));
    };

    socket.on("onlineUsers",           handleOnlineUsers);
    socket.on("receiveMessage",        handleReceiveMessage);
    socket.on("typing",                handleTyping);
    socket.on("messagesRead",          handleMessagesRead);
    socket.on("notificationsCleared",  handleNotificationsCleared);

    return () => {
      socket.off("onlineUsers",          handleOnlineUsers);
      socket.off("receiveMessage",       handleReceiveMessage);
      socket.off("typing",               handleTyping);
      socket.off("messagesRead",         handleMessagesRead);
      socket.off("notificationsCleared", handleNotificationsCleared);
    };
  }, [socket]);

  /* Load chats */
  const loadChats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(res.data);
    } catch (err) { console.log(err); }
  }, [token]);

  useEffect(() => { loadChats(); }, [loadChats]);

  /* Load messages */
  const loadMessages = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/messages/chat/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) { console.log(err); }
  };

  /* Load block status */
  const loadBlockStatus = async (userId) => {
    try {
      const res = await axios.get(`${API}/api/messages/block-status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIBlockedThem(res.data.iBlockedThem);
      setTheyBlockedMe(res.data.theyBlockedMe);
    } catch (err) { console.log(err); }
  };

  /* Load profile */
  const loadProfile = async (userId) => {
    setLoadingProfile(true);
    try {
      const res = await axios.get(`${API}/api/messages/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatProfile(res.data);
    } catch (err) { console.log(err); }
    finally { setLoadingProfile(false); }
  };

  /* Open chat */
  const openChat = (userId, userName, opportunityId = null) => {
    setSelectedUser(userId);
    setSelectedUserName(userName);
    setSelectedOpp(opportunityId);
    setShowProfile(false);
    setShowMenu(false);
    setMobileShowChat(true);
    loadMessages(userId);
    loadBlockStatus(userId);
    setChats(prev => prev.map(c => c._id === userId ? { ...c, unreadCount: 0 } : c));
  };

  /* Open profile */
  const openProfile = () => {
    setShowProfile(true);
    setShowMenu(false);
    if (selectedUser) loadProfile(selectedUser);
  };

  /* Send message */
  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;
    try {
      const res = await axios.post(
        `${API}/api/messages/send`,
        { receiverId: selectedUser, message: text, opportunityId: selectedOpp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(prev => [...prev, res.data]);
      setText("");
      loadChats();
    } catch (err) {
      if (err.response?.status === 403) alert(err.response.data.message);
    }
  };

  const handleKeyDown     = (e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } };
  const handleTypingInput = (e) => {
    setText(e.target.value);
    if (socket && selectedUser) socket.emit("typing", { sender: user?._id || user?.id, receiver: selectedUser });
  };

  /* Block / Unblock */
  const handleBlock = async () => {
    try {
      await axios.post(`${API}/api/messages/block/${selectedUser}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIBlockedThem(true); setShowMenu(false); setShowProfile(false);
    } catch (err) { console.log(err); }
  };
  const handleUnblock = async () => {
    try {
      await axios.post(`${API}/api/messages/unblock/${selectedUser}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setIBlockedThem(false);
    } catch (err) { console.log(err); }
  };

  /* ── Close report modal & reset all state ── */
  const closeReportModal = () => {
    setShowReport(false);
    setReportReason("");
    setReportSuccess(false);
    setReportError("");
    setReportSubmitting(false);
  };

  /* ── Report — with inline error, no alert() ── */
  const submitReport = async () => {
    if (!reportReason) {
      setReportError("Please select a reason.");
      return;
    }

    setReportSubmitting(true);
    setReportError("");

    try {
      await axios.post(
        `${API}/api/reports/user`,
        {
          reportedUserId: selectedUser,
          reason:         reportReason,
          description:    `Reported from messages by ${user?.name}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ Show inline success — no setTimeout auto-close
      setReportSuccess(true);
    } catch (err) {
      // ✅ Show inline error from backend (e.g. "already reported")
      setReportError(
        err.response?.data?.message || "Error submitting report. Please try again."
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  /* Navigate from other page */
  useEffect(() => {
    if (location.state) {
      const { userId, userName, opportunityId } = location.state;
      openChat(userId, userName, opportunityId);
    }
  }, [location.state]);

  const filteredChats    = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage?.toLowerCase().includes(search.toLowerCase())
  );
  const isBlocked        = iBlockedThem || theyBlockedMe;
  const selectedChatName = chats.find(c => c._id === selectedUser)?.name || selectedUserName || "Chat";
  const isOnline         = onlineUsers.includes(selectedUser);

  return (
    <Layout>
      <div className="msg-page">

        {/* ── SIDEBAR ── */}
        <div className={`msg-sidebar ${mobileShowChat ? "msg-sidebar-hidden" : ""}`}>
          <div className="msg-sidebar-header"><h2>Messages</h2></div>

          <div className="msg-search-wrapper">
            <Search size={14} />
            <input placeholder="Search conversations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="msg-chat-list">
            {filteredChats.length === 0 ? (
              <div className="msg-empty-list">No conversations yet</div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat._id}
                  className={`msg-chat-item ${selectedUser === chat._id ? "active" : ""}`}
                  onClick={() => openChat(chat._id, chat.name)}
                >
                  <div className="msg-chat-avatar">
                    {chat.name?.charAt(0)?.toUpperCase()}
                    {onlineUsers.includes(chat._id) && <div className="msg-online-dot" />}
                  </div>
                  <div className="msg-chat-info">
                    <div className="msg-chat-name-row">
                      <span className={`msg-chat-name ${chat.unreadCount > 0 ? "unread" : ""}`}>{chat.name}</span>
                      <span className="msg-chat-time">
                        {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                      </span>
                    </div>
                    <div className="msg-chat-preview-row">
                      <span className={`msg-chat-preview ${chat.unreadCount > 0 ? "unread" : ""}`}>
                        {chat.lastMessage || "No messages yet"}
                      </span>
                      {chat.unreadCount > 0 && <span className="msg-unread-badge">{chat.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── CHAT WINDOW ── */}
        <div className={`msg-window ${mobileShowChat ? "msg-window-visible" : ""}`}>
          {!selectedUser ? (
            <div className="msg-empty-window">
              <div className="msg-empty-icon">💬</div>
              <p>Select a conversation</p>
              <span>Choose from your existing conversations or start a new one</span>
            </div>
          ) : (
            <>
              <div className="msg-window-header">
                <button className="msg-back-btn" onClick={() => setMobileShowChat(false)}>
                  <ChevronLeft size={20} />
                </button>
                <div className="msg-header-user" onClick={openProfile} style={{ cursor: "pointer" }}>
                  <div className="msg-header-avatar">
                    {selectedChatName.charAt(0).toUpperCase()}
                    {isOnline && <div className="msg-header-online" />}
                  </div>
                  <div>
                    <p className="msg-header-name">{selectedChatName}</p>
                    <p className="msg-header-status">{typingUser ? "typing..." : isOnline ? "Online" : "Offline"}</p>
                  </div>
                </div>
                <div className="msg-header-actions" ref={menuRef}>
                  <button className="msg-menu-btn" onClick={() => setShowMenu(p => !p)}>
                    <MoreVertical size={18} />
                  </button>
                  {showMenu && (
                    <div className="msg-dropdown">
                      <div className="msg-dropdown-item" onClick={openProfile}>View Profile</div>
                      {iBlockedThem ? (
                        <div className="msg-dropdown-item" onClick={handleUnblock}><Shield size={13} /> Unblock</div>
                      ) : (
                        <div className="msg-dropdown-item danger" onClick={handleBlock}><ShieldOff size={13} /> Block</div>
                      )}
                      <div className="msg-dropdown-item danger" onClick={() => { setShowReport(true); setShowMenu(false); }}>
                        <Flag size={13} /> Report
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {iBlockedThem && (
                <div className="msg-blocked-banner">
                  <ShieldOff size={14} /> You have blocked this user.{" "}
                  <button onClick={handleUnblock}>Unblock</button>
                </div>
              )}
              {theyBlockedMe && (
                <div className="msg-blocked-banner"><ShieldOff size={14} /> You cannot message this user.</div>
              )}

              <div className="msg-body">
                {messages.length === 0 ? (
                  <div className="msg-body-empty">No messages yet — say hello!</div>
                ) : (
                  messages.map(msg => {
                    const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
                    const isSender = senderId === user?._id || senderId === user?.id;
                    return (
                      <div key={msg._id} className={`msg-bubble-wrapper ${isSender ? "sent" : "received"}`}>
                        <div className={`msg-bubble ${isSender ? "sent" : "received"}`}>
                          <p className="msg-bubble-text">{msg.message}</p>
                          <div className="msg-bubble-meta">
                            <span className="msg-bubble-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isSender && <span className={`msg-read-tick ${msg.isRead ? "read" : ""}`}>✔✔</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isBlocked ? (
                <div className="msg-input-row">
                  <input
                    className="msg-input"
                    value={text}
                    onChange={handleTypingInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                  />
                  <button className="msg-send-btn" onClick={sendMessage} disabled={!text.trim()}>
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <div className="msg-input-blocked">Messaging is unavailable</div>
              )}
            </>
          )}
        </div>

        {/* ── PROFILE PANEL + OVERLAY ── */}
        {showProfile && selectedUser && (
          <>
            <div className="msg-profile-overlay" onClick={() => setShowProfile(false)} />
            <div className="msg-profile-panel" ref={profilePanelRef}>
              <div className="msg-profile-header">
                <h3>Profile</h3>
                <button className="msg-profile-close" onClick={() => setShowProfile(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="msg-profile-scroll">
                {loadingProfile ? (
                  <div className="msg-profile-loading">Loading...</div>
                ) : chatProfile ? (
                  <>
                    <div className="msg-profile-hero">
                      <div className="msg-profile-avatar">{chatProfile.name?.charAt(0)?.toUpperCase()}</div>
                      <p className="msg-profile-name">{chatProfile.name}</p>
                      <p className="msg-profile-email">{chatProfile.email}</p>
                      <span className={`msg-profile-role ${chatProfile.role}`}>{chatProfile.role}</span>
                    </div>

                    {chatProfile.location && (
                      <div className="msg-profile-section">
                        <p className="msg-profile-section-label">Details</p>
                        <div className="msg-profile-row"><MapPin size={13} /><span>{chatProfile.location}</span></div>
                      </div>
                    )}

                    {chatProfile.bio && (
                      <div className="msg-profile-section">
                        <p className="msg-profile-section-label">About</p>
                        <p className="msg-profile-bio">{chatProfile.bio}</p>
                      </div>
                    )}

                    {chatProfile.skills?.length > 0 && (
                      <div className="msg-profile-section">
                        <p className="msg-profile-section-label"><Award size={11} /> Skills</p>
                        <div className="msg-profile-skills">
                          {chatProfile.skills.map((s, i) => <span key={i} className="msg-skill-pill">{s}</span>)}
                        </div>
                      </div>
                    )}

                    {chatProfile.acceptedOpportunities?.length > 0 && (
                      <div className="msg-profile-section">
                        <p className="msg-profile-section-label"><Briefcase size={11} /> Accepted Opportunities</p>
                        <div className="msg-opp-list">
                          {chatProfile.acceptedOpportunities.map((opp) => (
                            <div key={opp._id} className="msg-opp-card">
                              <p className="msg-opp-title">{opp.title}</p>
                              {opp.location && (
                                <div className="msg-opp-meta"><MapPin size={11} /><span>{opp.location}</span></div>
                              )}
                              {opp.date && (
                                <div className="msg-opp-meta">
                                  <Calendar size={11} />
                                  <span>{new Date(opp.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                </div>
                              )}
                              {opp.description && <p className="msg-opp-desc">{opp.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="msg-profile-actions">
                      {iBlockedThem ? (
                        <button className="msg-unblock-btn" onClick={handleUnblock}><Shield size={14} /> Unblock User</button>
                      ) : (
                        <button className="msg-block-btn" onClick={handleBlock}><ShieldOff size={14} /> Block User</button>
                      )}
                      <button className="msg-report-btn" onClick={() => { setShowProfile(false); setShowReport(true); }}>
                        <Flag size={14} /> Report
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </>
        )}

      </div>

      {/* ── REPORT MODAL ── */}
      {showReport && (
        /* ✅ Click overlay to close */
        <div className="msg-modal-overlay" onClick={closeReportModal}>
          <div className="msg-modal-box" onClick={e => e.stopPropagation()}>

            {/* ✅ X button always visible top-right */}
            <div className="msg-modal-header">
              <h3>Report User</h3>
              <button className="msg-modal-close" onClick={closeReportModal}>
                <X size={16} />
              </button>
            </div>

            {reportSuccess ? (
              /* ✅ SUCCESS STATE — no auto-close, user closes via X or click outside */
              <div className="msg-report-success">
                <CheckCircle size={44} className="msg-report-success-icon" />
                <p>Report submitted successfully.</p>
                <span>Our team will review <strong>{selectedChatName}</strong> shortly.</span>
              </div>
            ) : (
              <>
                <p className="msg-modal-sub">
                  Tell us why you're reporting <strong>{selectedChatName}</strong>
                </p>

                <select
                  className="msg-report-select"
                  value={reportReason}
                  onChange={e => {
                    setReportReason(e.target.value);
                    setReportError(""); // clear error on change
                  }}
                >
                  <option value="">Select a reason</option>
                  <option value="Spam">Spam</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Inappropriate Content">Inappropriate Content</option>
                  <option value="Fake Account">Fake Account</option>
                  <option value="Other">Other</option>
                </select>

                {/* ✅ Inline error — shown for "already reported" or missing reason */}
                {reportError && (
                  <div className="msg-report-error">
                    <AlertCircle size={14} />
                    <span>{reportError}</span>
                  </div>
                )}

                <div className="msg-modal-actions">
                  <button
                    className="msg-modal-cancel"
                    onClick={closeReportModal}
                    disabled={reportSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    className="msg-modal-submit"
                    onClick={submitReport}
                    disabled={reportSubmitting}
                  >
                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </Layout>
  );
}

export default Messages;