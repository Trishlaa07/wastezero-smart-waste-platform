import Layout from "../../components/Layout";
import { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/adminSupport.css";
import { MessageCircle, Send, CheckCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

export default function AdminSupport() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBox, setReplyBox] = useState({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/api/support/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (id) => {
    if (!replyBox[id]) return;

    try {
      await axios.post(
        `${API}/api/admin/support/reply/${id}`,
        { reply: replyBox[id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReplyBox({ ...replyBox, [id]: "" });
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const markResolved = async (id) => {
    try {
      await axios.put(
        `${API}/api/admin/support/resolve/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <Layout><p style={{ padding: 40 }}>Loading support requests...</p></Layout>;
  }

  return (
    <Layout>
      <div className="sp-page">

        {/* HEADER */}
        <div className="sp-header">
          <div>
            <h2 className="sp-heading">Support Requests</h2>
            <p className="sp-sub">Manage user queries and respond instantly</p>
          </div>
        </div>

        {/* LIST */}
        <div className="sp-list">
          {requests.length === 0 && (
            <p className="sp-empty">No support requests yet</p>
          )}

          {requests.map((req) => (
            <div key={req._id} className="sp-card">

              {/* TOP */}
              <div className="sp-top">
                <div className="sp-user">
                  <MessageCircle size={18} />
                  <div>
                    <p className="sp-subject">{req.subject}</p>
                    <p className="sp-user-name">
                      {req.user?.name || "User"}
                    </p>
                  </div>
                </div>

                <span className={`sp-status ${req.status}`}>
                  {req.status}
                </span>
              </div>

              {/* MESSAGE */}
              <p className="sp-message">{req.message}</p>

              {/* REPLY BOX */}
              {req.status !== "resolved" && (
                <div className="sp-reply">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyBox[req._id] || ""}
                    onChange={(e) =>
                      setReplyBox({
                        ...replyBox,
                        [req._id]: e.target.value
                      })
                    }
                  />

                  <button onClick={() => sendReply(req._id)}>
                    <Send size={14} />
                    Reply
                  </button>
                </div>
              )}

              {/* ACTIONS */}
              <div className="sp-actions">
                {req.status !== "resolved" && (
                  <button
                    className="resolve-btn"
                    onClick={() => markResolved(req._id)}
                  >
                    <CheckCircle size={14} />
                    Mark Resolved
                  </button>
                )}
              </div>

              {/* ADMIN REPLY */}
              {req.reply && (
                <div className="sp-admin-reply">
                  <p>Admin Reply:</p>
                  <span>{req.reply}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}