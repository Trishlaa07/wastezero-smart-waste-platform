import { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import "../../styles/SchedulePickup.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
];

const WASTE_TYPES = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "Electronic Waste",
  "Organic Waste",
];

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pending:      { bg: "#fef3c7", color: "#92400e" },
    accepted:     { bg: "#dcfce7", color: "#166534" },
    "in-transit": { bg: "#dbeafe", color: "#1e40af" },
    completed:    { bg: "#f3f4f6", color: "#374151" },
    cancelled:    { bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, textTransform: "capitalize",
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function SchedulePickup() {
  const token  = localStorage.getItem("token");
  const socket = useSocket();
  const user   = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  // Redirect unauthenticated users rather than silently treating them as volunteers
  const role = user?.role === "ngo" || user?.role === "admin" ? "ngo" : "volunteer";

  const [tab,        setTab]        = useState(role === "ngo" ? "manage" : "new");
  const [step,       setStep]       = useState(1);
  const [error,      setError]      = useState("");
  const [notice,     setNotice]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);

  const emptyForm = {
    address: "", city: "", pickupDate: "",
    timeSlot: "", wasteTypes: [], additionalNotes: "",
  };
  const [form,    setForm]    = useState(emptyForm);
  const [pickups, setPickups] = useState([]);

  // NGO agent assignment state
  const [agentInputs, setAgentInputs] = useState({}); // pickupId → agent name string

  // ── Fetch pickups from backend ──
  const fetchPickups = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      const endpoint = role === "ngo" ? "/api/pickups/ngo" : "/api/pickups";
      const res = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) setPickups(res.data);
    } catch (err) {
      console.error("Failed to fetch pickups:", err);
      setError("Could not load pickups. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => { fetchPickups(); }, [fetchPickups]);

  // ── Real-time: new pickup confirmed from backend ──
  useEffect(() => {
    if (!socket) return;
    const handleNew = (newPickup) => {
      // Only add to volunteer's own list if it belongs to them
      const myId = user?._id || user?.id;
      const volunteerId =
        typeof newPickup.volunteer === "object"
          ? newPickup.volunteer._id || newPickup.volunteer.id
          : newPickup.volunteer;
      if (myId && volunteerId?.toString() !== myId?.toString()) return;

      setPickups(prev => {
        if (prev.find(p => p._id === newPickup._id)) return prev;
        return [newPickup, ...prev];
      });
    };
    socket.on("newPickup", handleNew);
    return () => socket.off("newPickup", handleNew);
  }, [socket, user]);

  // ── Real-time: status/agent updated by NGO ──
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = (updated) => {
      setPickups(prev =>
        prev.map(p => p._id === updated._id ? { ...p, ...updated } : p)
      );
    };
    socket.on("pickupUpdated", handleUpdated);
    return () => socket.off("pickupUpdated", handleUpdated);
  }, [socket]);

  // ── Auto-dismiss notice ──
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // ── Step 1 validation ──
  const canStep2 = () =>
    form.address.trim() && form.city.trim() && form.pickupDate && form.timeSlot;

  const goNext = () => {
    setError("");
    if (!canStep2()) {
      setError("Please fill in Address, City, Pickup Date, and Time Slot.");
      return;
    }
    setStep(2);
  };

  const toggleWasteType = (wt) =>
    setForm(prev => ({
      ...prev,
      wasteTypes: prev.wasteTypes.includes(wt)
        ? prev.wasteTypes.filter(x => x !== wt)
        : [...prev.wasteTypes, wt],
    }));

  // ── Submit new pickup ──
  const handleSubmit = async () => {
    setError("");
    if (!form.wasteTypes.length) {
      setError("Please select at least one waste type.");
      return;
    }
    if (!token) {
      setError("You must be logged in to schedule a pickup.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/api/pickups`,
        {
          address:         form.address,
          city:            form.city,
          pickupDate:      form.pickupDate,
          timeSlot:        form.timeSlot,
          wasteType:       form.wasteTypes.join(", "), // backend stores as string
          additionalNotes: form.additionalNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add the real backend entry (has _id) to the top of the list
      setPickups(prev => [res.data, ...prev]);
      setNotice("Pickup scheduled! The NGO will assign an agent shortly.");
      setForm(emptyForm);
      setStep(1);
      setTab("history");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to schedule pickup. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── NGO: assign agent (updates status to "accepted") ──
  const assignAgent = async (pickupId) => {
    const agentName = (agentInputs[pickupId] || "").trim();
    if (!agentName) {
      setError("Please enter an agent name before assigning.");
      return;
    }
    setError("");
    try {
      const res = await axios.put(
        `${API}/api/pickups/${pickupId}/status`,
        { status: "accepted", assignedTo: agentName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPickups(prev =>
        prev.map(p => (p._id === pickupId ? { ...p, ...res.data } : p))
      );
      setAgentInputs(prev => { const n = { ...prev }; delete n[pickupId]; return n; });
      setNotice(`Agent "${agentName}" assigned successfully.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign agent.");
    }
  };

  // ── Volunteer: cancel a pending pickup ──
  const cancelPickup = async (pickupId) => {
    if (!window.confirm("Are you sure you want to cancel this pickup?")) return;
    try {
      await axios.delete(`${API}/api/pickups/${pickupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPickups(prev =>
        prev.map(p => (p._id === pickupId ? { ...p, status: "cancelled" } : p))
      );
      setNotice("Pickup cancelled.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel pickup.");
    }
  };

  const pendingPickups = pickups.filter(p => p.status === "pending");

  const tabs =
    role === "ngo"
      ? [
          { key: "manage",  label: "Manage Pickups"    },
          { key: "history", label: "All Pickup History" },
        ]
      : [
          { key: "new",     label: "Schedule New Pickup" },
          { key: "history", label: "Pickup History"      },
        ];

  // ── Helper: normalise wasteType for display ──
  const displayWaste = (p) =>
    Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—";

  return (
    <Layout>
      <div className="sp-page">

        {/* ── Header ── */}
        <div className="sp-page-header">
          <h2 className="sp-page-title">Schedule Pickup</h2>
          <p className="sp-page-sub">
            {role === "ngo"
              ? "Review incoming requests and assign pickup agents"
              : "Request waste collection and manage your pickups"}
          </p>
        </div>

        {notice && <div className="sp-notice">{notice}</div>}

        {/* ── Tabs ── */}
        <div className="sp-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`sp-tab${tab === t.key ? " active" : ""}`}
              onClick={() => { setTab(t.key); setError(""); setStep(1); }}
            >
              {t.label}
              {t.key === "manage" && pendingPickups.length > 0 && (
                <span className="sp-tab-badge">{pendingPickups.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════
            VOLUNTEER — Schedule New Pickup
        ══════════════════════════════════════════ */}
        {tab === "new" && role === "volunteer" && (
          <div className="sp-card sp-form-card">

            {/* Step bar */}
            <div className="sp-step-bar">
              <div className="sp-step-wrap">
                <div className={`sp-step-dot${step >= 1 ? " active" : ""}${step > 1 ? " done" : ""}`}>
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className={`sp-step-lbl${step === 1 ? " active" : ""}`}>
                  Location &amp; Time
                </span>
              </div>
              <div className={`sp-step-connector${step > 1 ? " done" : ""}`} />
              <div className="sp-step-wrap">
                <div className={`sp-step-dot${step === 2 ? " active" : ""}`}>2</div>
                <span className={`sp-step-lbl${step === 2 ? " active" : ""}`}>
                  Waste Details
                </span>
              </div>
            </div>

            <div className="sp-card-title">
              {step === 1 ? "Request Waste Collection" : "Waste Details"}
            </div>
            <p className="sp-card-sub">
              {step === 1
                ? "Fill in the details to schedule a pickup for your recyclable waste"
                : "Select the type of waste and add any special instructions"}
            </p>

            {error && <div className="sp-error">{error}</div>}

            {step === 1 && (
              <div className="sp-form-body">
                <div className="sp-field">
                  <label>Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Enter your street address"
                  />
                </div>

                <div className="sp-row-2">
                  <div className="sp-field">
                    <label>City</label>
                    <input
                      value={form.city}
                      onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      placeholder="Your city"
                    />
                  </div>
                  <div className="sp-field">
                    <label>Pickup Date</label>
                    <input
                      type="date"
                      value={form.pickupDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => setForm(p => ({ ...p, pickupDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="sp-field">
                  <label>Preferred Time Slot</label>
                  <select
                    value={form.timeSlot}
                    onChange={e => setForm(p => ({ ...p, timeSlot: e.target.value }))}
                  >
                    <option value="">Select a time slot</option>
                    {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="sp-actions-right">
                  <button className="sp-primary-btn" onClick={goNext}>
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="sp-form-body">
                <div className="sp-field">
                  <label>Waste Types</label>
                  <p className="sp-help">Select all types that apply</p>
                  <div className="sp-check-grid">
                    {WASTE_TYPES.map(wt => (
                      <label
                        key={wt}
                        className={`sp-check-label${form.wasteTypes.includes(wt) ? " checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.wasteTypes.includes(wt)}
                          onChange={() => toggleWasteType(wt)}
                        />
                        {wt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sp-field">
                  <label>Additional Notes</label>
                  <p className="sp-help">
                    Any special instructions for the pickup team (access, packaging, etc.)
                  </p>
                  <textarea
                    value={form.additionalNotes}
                    onChange={e => setForm(p => ({ ...p, additionalNotes: e.target.value }))}
                    placeholder="e.g. Gate code is 1234, bags are near the entrance…"
                  />
                  <p className="sp-footnote">Write "N/A" if no special instructions.</p>
                </div>

                <div className="sp-actions-between">
                  <button
                    className="sp-secondary-btn"
                    onClick={() => { setStep(1); setError(""); }}
                    disabled={submitting}
                  >
                    ← Previous
                  </button>
                  <button
                    className="sp-primary-btn"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? "Scheduling…" : "Schedule Pickup"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            VOLUNTEER — Pickup History
        ══════════════════════════════════════════ */}
        {tab === "history" && role === "volunteer" && (
          <div className="sp-card">
            <div className="sp-card-title">Your Pickup History</div>
            <p className="sp-card-sub">View and manage all your scheduled pickups</p>

            {loading ? (
              <p className="sp-loading">Loading…</p>
            ) : pickups.length === 0 ? (
              <div className="sp-history-empty">
                <p className="sp-history-empty-text">
                  You haven't scheduled any pickups yet.
                </p>
                <button
                  className="sp-history-empty-btn"
                  onClick={() => { setTab("new"); setStep(1); }}
                >
                  Schedule your first pickup
                </button>
              </div>
            ) : (
              <div className="sp-history-list">
                {pickups.map(p => (
                  <div key={p._id} className="sp-history-item">
                    <div className="sp-history-left">
                      <span className="sp-history-date">
                        {p.pickupDate} · {p.timeSlot}
                      </span>
                      <span className="sp-history-meta">
                        {displayWaste(p)} · {p.city}
                      </span>
                      <span className="sp-history-address">{p.address}</span>
                      {p.assignedTo && (
                        <span className="sp-history-agent">✓ Agent: {p.assignedTo}</span>
                      )}
                    </div>
                    <div className="sp-history-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusPill status={p.status} />
                      {p.status === "pending" && (
                        <button
                          className="sp-secondary-btn"
                          style={{ fontSize: 11, padding: "4px 10px" }}
                          onClick={() => cancelPickup(p._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            NGO — Manage Pickups
        ══════════════════════════════════════════ */}
        {tab === "manage" && role === "ngo" && (
          <div>
            {/* Stats */}
            <div className="sp-stats-row">
              {[
                { label: "Total Requests",  value: pickups.length,                                           color: "#1f7a6b" },
                { label: "Pending",         value: pendingPickups.length,                                    color: "#b45309" },
                { label: "Accepted",        value: pickups.filter(p => p.status === "accepted").length,      color: "#166534" },
                { label: "In Transit",      value: pickups.filter(p => p.status === "in-transit").length,    color: "#1d4ed8" },
              ].map(s => (
                <div key={s.label} className="sp-stat-card">
                  <div className="sp-stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="sp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {error && <div className="sp-error">{error}</div>}

            {loading ? (
              <p className="sp-loading">Loading…</p>
            ) : (
              <>
                <div className="sp-section-label">Pending Requests</div>

                {pendingPickups.length === 0 ? (
                  <div className="sp-card sp-empty-box">
                    <p className="sp-history-empty-text">All pickups have been assigned.</p>
                  </div>
                ) : (
                  pendingPickups.map(p => (
                    <div key={p._id} className="sp-card sp-manage-card">
                      <div className="sp-manage-card-top">
                        <div className="sp-manage-card-info">
                          {/* volunteer is populated from backend */}
                          <div className="sp-manage-volunteer">
                            {p.volunteer?.name || "Volunteer"}
                            {p.volunteer?.phone && (
                              <span style={{ marginLeft: 8, fontWeight: 400, color: "#6b7280", fontSize: 12 }}>
                                {p.volunteer.phone}
                              </span>
                            )}
                          </div>
                          <div className="sp-manage-detail">📅 {p.pickupDate} · {p.timeSlot}</div>
                          <div className="sp-manage-detail">📍 {p.address}, {p.city}</div>
                          <div className="sp-manage-detail">🗑 {displayWaste(p)}</div>
                          {p.additionalNotes && (
                            <div className="sp-manage-notes">"{p.additionalNotes}"</div>
                          )}
                        </div>
                        <StatusPill status={p.status} />
                      </div>

                      {/* Agent assignment — free-text input (no more mock data) */}
                      <div className="sp-assign-row">
                        <input
                          className="sp-assign-select"
                          type="text"
                          placeholder="Enter agent name…"
                          value={agentInputs[p._id] || ""}
                          onChange={e =>
                            setAgentInputs(prev => ({ ...prev, [p._id]: e.target.value }))
                          }
                        />
                        <button
                          className="sp-primary-btn"
                          onClick={() => assignAgent(p._id)}
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Accepted / in-transit pickups */}
                {pickups.filter(p => ["accepted", "in-transit"].includes(p.status)).length > 0 && (
                  <>
                    <div className="sp-section-label" style={{ marginTop: 28 }}>
                      Active Pickups
                    </div>
                    {pickups
                      .filter(p => ["accepted", "in-transit"].includes(p.status))
                      .map(p => (
                        <div key={p._id} className="sp-card sp-manage-card sp-manage-card--assigned">
                          <div className="sp-manage-card-top">
                            <div className="sp-manage-card-info">
                              <div className="sp-manage-volunteer">
                                {p.volunteer?.name || "Volunteer"}
                              </div>
                              <div className="sp-manage-detail">
                                {p.pickupDate} · {p.timeSlot} · {p.city}
                              </div>
                              {p.assignedTo && (
                                <div className="sp-assigned-agent">✓ Agent: {p.assignedTo}</div>
                              )}
                            </div>
                            <StatusPill status={p.status} />
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            NGO — All History
        ══════════════════════════════════════════ */}
        {tab === "history" && role === "ngo" && (
          <div className="sp-card">
            <div className="sp-card-title">All Pickup History</div>
            <p className="sp-card-sub">
              Complete log of all pickup requests on the platform
            </p>

            {loading ? (
              <p className="sp-loading">Loading…</p>
            ) : pickups.length === 0 ? (
              <div className="sp-history-empty">
                <p className="sp-history-empty-text">No pickups have been scheduled yet.</p>
              </div>
            ) : (
              <div className="sp-history-list">
                {pickups.map(p => (
                  <div key={p._id} className="sp-history-item">
                    <div className="sp-history-left">
                      <span className="sp-history-date">
                        {p.volunteer?.name || "Volunteer"} · {p.pickupDate} · {p.timeSlot}
                      </span>
                      <span className="sp-history-meta">
                        {displayWaste(p)} · {p.city}
                      </span>
                      <span className="sp-history-address">{p.address}</span>
                      {p.assignedTo && (
                        <span className="sp-history-agent">✓ Agent: {p.assignedTo}</span>
                      )}
                    </div>
                    <div className="sp-history-actions">
                      <StatusPill status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
}

export default SchedulePickup;