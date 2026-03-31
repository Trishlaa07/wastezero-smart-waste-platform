import { useEffect, useMemo, useState, useCallback } from "react";
import Layout from "../../components/Layout";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import { Pencil, Trash2, X } from "lucide-react";
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
  "Plastic", "Paper", "Glass", "Metal", "Electronic Waste", "Organic Waste",
];

// Waste type icons for visual clarity
const WASTE_ICONS = {
  "Plastic":        "🧴",
  "Paper":          "📄",
  "Glass":          "🫙",
  "Metal":          "🔩",
  "Electronic Waste":"💻",
  "Organic Waste":  "🌿",
};

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
      background: s.bg, color: s.color, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ── Reusable waste type selector ──
function WasteTypeSelector({ selected, onChange }) {
  const toggle = (wt) => {
    onChange(
      selected.includes(wt)
        ? selected.filter(x => x !== wt)
        : [...selected, wt]
    );
  };

  return (
    <div className="sp-waste-grid">
      {WASTE_TYPES.map(wt => {
        const isSelected = selected.includes(wt);
        return (
          <button
            key={wt}
            type="button"
            className={`sp-waste-chip${isSelected ? " selected" : ""}`}
            onClick={() => toggle(wt)}
          >
            <span className="sp-waste-icon">{WASTE_ICONS[wt]}</span>
            <span className="sp-waste-label">{wt}</span>
            {isSelected && <span className="sp-waste-tick">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function SchedulePickup() {
  const token  = localStorage.getItem("token");
  const socket = useSocket();
  const user   = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  const role = user?.role === "ngo" || user?.role === "admin" ? "ngo" : "volunteer";

  const [tab,        setTab]        = useState(role === "ngo" ? "manage" : "new");
  const [step,       setStep]       = useState(1);
  const [error,      setError]      = useState("");
  const [notice,     setNotice]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [pickups,    setPickups]    = useState([]);
  const [agentInputs, setAgentInputs] = useState({});

  // ── Edit modal ──
  const [editModal,  setEditModal]  = useState(false);
  const [editForm,   setEditForm]   = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState("");

  const emptyForm = {
    address: "", city: "", pickupDate: "",
    timeSlot: "", wasteTypes: [], additionalNotes: "",
  };
  const [form, setForm] = useState(emptyForm);

  // ── Fetch pickups ──
  const fetchPickups = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true);
      const endpoint = role === "ngo" ? "/api/pickups/ngo" : "/api/pickups";
      const res = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) setPickups(res.data);
    } catch {
      setError("Could not load pickups. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [token, role]);

  useEffect(() => { fetchPickups(); }, [fetchPickups]);

  // ── Socket: new pickup — let socket handle state, NOT handleSubmit ──
  useEffect(() => {
    if (!socket) return;
    const handleNew = (newPickup) => {
      if (role === "volunteer") {
        const myId = (user?._id || user?.id)?.toString();
        const vid  = typeof newPickup.volunteer === "object"
          ? (newPickup.volunteer._id || newPickup.volunteer.id)?.toString()
          : newPickup.volunteer?.toString();
        if (myId && vid !== myId) return;
      }
      // Deduplicate — this is the ONLY place we add to state after submit
      setPickups(prev => {
        if (prev.find(p => p._id === newPickup._id)) return prev;
        return [newPickup, ...prev];
      });
    };
    socket.on("newPickup", handleNew);
    return () => socket.off("newPickup", handleNew);
  }, [socket, user, role]);

  // ── Socket: pickup updated ──
  useEffect(() => {
    if (!socket) return;
    const handleUpdated = (updated) => {
      setPickups(prev => prev.map(p => p._id === updated._id ? { ...p, ...updated } : p));
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

  // ── Step validation ──
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

  // ── Submit new pickup — NO manual setPickups, socket handles it ──
  const handleSubmit = async () => {
    setError("");
    if (!form.wasteTypes.length) {
      setError("Please select at least one waste type.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/api/pickups`,
        {
          address:         form.address,
          city:            form.city,
          pickupDate:      form.pickupDate,
          timeSlot:        form.timeSlot,
          wasteType:       form.wasteTypes.join(", "),
          additionalNotes: form.additionalNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // ✅ Do NOT call setPickups here — socket newPickup event adds it
      setNotice("Pickup scheduled! The NGO will assign an agent shortly.");
      setForm(emptyForm);
      setStep(1);
      setTab("history");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to schedule pickup.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open edit modal ──
  const openEditModal = (pickup) => {
    setEditError("");
    setEditForm({
      _id:             pickup._id,
      address:         pickup.address         || "",
      city:            pickup.city            || "",
      pickupDate:      pickup.pickupDate      || "",
      timeSlot:        pickup.timeSlot        || "",
      wasteTypes:      pickup.wasteType
        ? pickup.wasteType.split(",").map(w => w.trim()).filter(Boolean)
        : [],
      additionalNotes: pickup.additionalNotes || "",
    });
    setEditModal(true);
  };

  // ── Save edit — validates, calls PUT, updates state from response ──
  const handleEditSave = async () => {
    setEditError("");

    if (!editForm.address.trim()) { setEditError("Address is required."); return; }
    if (!editForm.city.trim())    { setEditError("City is required.");    return; }
    if (!editForm.pickupDate)     { setEditError("Pickup date is required."); return; }
    if (!editForm.timeSlot)       { setEditError("Time slot is required."); return; }
    if (!editForm.wasteTypes.length) {
      setEditError("Please select at least one waste type."); return;
    }

    setEditSaving(true);
    try {
      const res = await axios.put(
        `${API}/api/pickups/${editForm._id}`,
        {
          address:         editForm.address,
          city:            editForm.city,
          pickupDate:      editForm.pickupDate,
          timeSlot:        editForm.timeSlot,
          wasteType:       editForm.wasteTypes.join(", "),
          additionalNotes: editForm.additionalNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update state directly from API response (socket also fires but deduplicates)
      setPickups(prev =>
        prev.map(p => p._id === res.data._id ? { ...p, ...res.data } : p)
      );
      setEditModal(false);
      setEditForm(null);
      setNotice("Pickup updated successfully!");
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update pickup.");
    } finally {
      setEditSaving(false);
    }
  };

  // ── Cancel pickup ──
  const cancelPickup = async (pickupId) => {
    if (!window.confirm("Cancel this pickup?")) return;
    try {
      await axios.delete(`${API}/api/pickups/${pickupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPickups(prev =>
        prev.map(p => p._id === pickupId ? { ...p, status: "cancelled" } : p)
      );
      setNotice("Pickup cancelled.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel pickup.");
    }
  };

  // ── NGO assign agent ──
  const assignAgent = async (pickupId) => {
    const agentName = (agentInputs[pickupId] || "").trim();
    if (!agentName) { setError("Please enter an agent name."); return; }
    setError("");
    try {
      const res = await axios.put(
        `${API}/api/pickups/${pickupId}/status`,
        { status: "accepted", assignedTo: agentName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPickups(prev =>
        prev.map(p => p._id === pickupId ? { ...p, ...res.data } : p)
      );
      setAgentInputs(prev => { const n = { ...prev }; delete n[pickupId]; return n; });
      setNotice(`Agent "${agentName}" assigned successfully.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign agent.");
    }
  };

  const pendingPickups = pickups.filter(p => p.status === "pending");
  const displayWaste   = (p) =>
    Array.isArray(p.wasteTypes) ? p.wasteTypes.join(", ") : p.wasteType || "—";

  const tabs = role === "ngo"
    ? [{ key: "manage", label: "Manage Pickups" }, { key: "history", label: "All Pickup History" }]
    : [{ key: "new", label: "Schedule New Pickup" }, { key: "history", label: "Pickup History" }];

  return (
    <Layout>
      <div className="sp-page">

        <div className="sp-page-header">
          <h2 className="sp-page-title">Schedule Pickup</h2>
          <p className="sp-page-sub">
            {role === "ngo"
              ? "Review incoming requests and assign pickup agents"
              : "Request waste collection and manage your pickups"}
          </p>
        </div>

        {notice && <div className="sp-notice">{notice}</div>}

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

        {/* ════ VOLUNTEER — Schedule New ════ */}
        {tab === "new" && role === "volunteer" && (
          <div className="sp-card sp-form-card">

            <div className="sp-step-bar">
              <div className="sp-step-wrap">
                <div className={`sp-step-dot${step >= 1 ? " active" : ""}${step > 1 ? " done" : ""}`}>
                  {step > 1 ? "✓" : "1"}
                </div>
                <span className={`sp-step-lbl${step === 1 ? " active" : ""}`}>Location &amp; Time</span>
              </div>
              <div className={`sp-step-connector${step > 1 ? " done" : ""}`} />
              <div className="sp-step-wrap">
                <div className={`sp-step-dot${step === 2 ? " active" : ""}`}>2</div>
                <span className={`sp-step-lbl${step === 2 ? " active" : ""}`}>Waste Details</span>
              </div>
            </div>

            <div className="sp-card-title">
              {step === 1 ? "Request Waste Collection" : "Waste Details"}
            </div>
            <p className="sp-card-sub">
              {step === 1
                ? "Fill in the details to schedule a pickup for your recyclable waste"
                : "Tap the waste types that apply, then add any notes"}
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
                  <button className="sp-primary-btn" onClick={goNext}>Next Step →</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="sp-form-body">
                <div className="sp-field">
                  <label>Waste Types</label>
                  <p className="sp-help">Tap to select all that apply</p>
                  <WasteTypeSelector
                    selected={form.wasteTypes}
                    onChange={(updated) => setForm(p => ({ ...p, wasteTypes: updated }))}
                  />
                </div>
                <div className="sp-field">
                  <label>Additional Notes</label>
                  <p className="sp-help">Any special instructions for the pickup team</p>
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
                  <button className="sp-primary-btn" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Scheduling…" : "Schedule Pickup"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ VOLUNTEER — History ════ */}
        {tab === "history" && role === "volunteer" && (
          <div className="sp-card">
            <div className="sp-card-title">Your Pickup History</div>
            <p className="sp-card-sub">View, edit, or cancel your scheduled pickups</p>

            {loading ? (
              <p className="sp-loading">Loading…</p>
            ) : pickups.length === 0 ? (
              <div className="sp-history-empty">
                <p className="sp-history-empty-text">You haven't scheduled any pickups yet.</p>
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
                      <span className="sp-history-date">{p.pickupDate} · {p.timeSlot}</span>
                      <span className="sp-history-meta">{displayWaste(p)} · {p.city}</span>
                      <span className="sp-history-address">{p.address}</span>
                      {p.additionalNotes && p.additionalNotes !== "N/A" && (
                        <span className="sp-history-notes">{p.additionalNotes}</span>
                      )}
                      {p.assignedTo && (
                        <span className="sp-history-agent">✓ Agent: {p.assignedTo}</span>
                      )}
                    </div>
                    <div className="sp-history-actions">
                      <StatusPill status={p.status} />
                      {p.status === "pending" && (
                        <div className="sp-action-btns">
                          <button
                            className="sp-icon-btn sp-icon-btn--edit"
                            onClick={() => openEditModal(p)}
                            title="Edit pickup"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="sp-icon-btn sp-icon-btn--cancel"
                            onClick={() => cancelPickup(p._id)}
                            title="Cancel pickup"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ NGO — Manage Pickups ════ */}
        {tab === "manage" && role === "ngo" && (
          <div>
            <div className="sp-stats-row">
              {[
                { label: "Total",      value: pickups.length,                                       color: "#1f7a6b" },
                { label: "Pending",    value: pendingPickups.length,                                 color: "#b45309" },
                { label: "Accepted",   value: pickups.filter(p => p.status === "accepted").length,   color: "#166534" },
                { label: "In Transit", value: pickups.filter(p => p.status === "in-transit").length, color: "#1d4ed8" },
              ].map(s => (
                <div key={s.label} className="sp-stat-card">
                  <div className="sp-stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="sp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {error && <div className="sp-error">{error}</div>}

            {loading ? <p className="sp-loading">Loading…</p> : (
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
                      <div className="sp-assign-row">
                        <input
                          className="sp-assign-select"
                          type="text"
                          placeholder="Enter agent name…"
                          value={agentInputs[p._id] || ""}
                          onChange={e => setAgentInputs(prev => ({ ...prev, [p._id]: e.target.value }))}
                        />
                        <button className="sp-primary-btn" onClick={() => assignAgent(p._id)}>
                          Assign
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {pickups.filter(p => ["accepted","in-transit"].includes(p.status)).length > 0 && (
                  <>
                    <div className="sp-section-label" style={{ marginTop: 28 }}>Active Pickups</div>
                    {pickups.filter(p => ["accepted","in-transit"].includes(p.status)).map(p => (
                      <div key={p._id} className="sp-card sp-manage-card sp-manage-card--assigned">
                        <div className="sp-manage-card-top">
                          <div className="sp-manage-card-info">
                            <div className="sp-manage-volunteer">{p.volunteer?.name || "Volunteer"}</div>
                            <div className="sp-manage-detail">{p.pickupDate} · {p.timeSlot} · {p.city}</div>
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

        {/* ════ NGO — All History ════ */}
        {tab === "history" && role === "ngo" && (
          <div className="sp-card">
            <div className="sp-card-title">All Pickup History</div>
            <p className="sp-card-sub">Complete log of all pickup requests</p>
            {loading ? <p className="sp-loading">Loading…</p> : pickups.length === 0 ? (
              <div className="sp-history-empty">
                <p className="sp-history-empty-text">No pickups yet.</p>
              </div>
            ) : (
              <div className="sp-history-list">
                {pickups.map(p => (
                  <div key={p._id} className="sp-history-item">
                    <div className="sp-history-left">
                      <span className="sp-history-date">
                        {p.volunteer?.name || "Volunteer"} · {p.pickupDate} · {p.timeSlot}
                      </span>
                      <span className="sp-history-meta">{displayWaste(p)} · {p.city}</span>
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

      {/* ════ Edit Modal ════ */}
      {editModal && editForm && (
        <div className="sp-modal-overlay" onClick={() => setEditModal(false)}>
          <div className="sp-modal" onClick={e => e.stopPropagation()}>

            <div className="sp-modal-header">
              <h3>Edit Pickup</h3>
              <button className="sp-modal-close" onClick={() => setEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sp-modal-body">
              {editError && <div className="sp-error">{editError}</div>}

              <div className="sp-field">
                <label>Address</label>
                <input
                  value={editForm.address}
                  onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>

              <div className="sp-row-2">
                <div className="sp-field">
                  <label>City</label>
                  <input
                    value={editForm.city}
                    onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="sp-field">
                  <label>Pickup Date</label>
                  <input
                    type="date"
                    value={editForm.pickupDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setEditForm(p => ({ ...p, pickupDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="sp-field">
                <label>Time Slot</label>
                <select
                  value={editForm.timeSlot}
                  onChange={e => setEditForm(p => ({ ...p, timeSlot: e.target.value }))}
                >
                  <option value="">Select a time slot</option>
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="sp-field">
                <label>Waste Types</label>
                <p className="sp-help">Tap to select all that apply</p>
                <WasteTypeSelector
                  selected={editForm.wasteTypes}
                  onChange={(updated) => setEditForm(p => ({ ...p, wasteTypes: updated }))}
                />
              </div>

              <div className="sp-field">
                <label>Additional Notes</label>
                <textarea
                  value={editForm.additionalNotes}
                  onChange={e => setEditForm(p => ({ ...p, additionalNotes: e.target.value }))}
                  placeholder="Any special instructions…"
                />
              </div>
            </div>

            <div className="sp-modal-footer">
              <button className="sp-secondary-btn" onClick={() => setEditModal(false)}>
                Cancel
              </button>
              <button
                className="sp-primary-btn"
                onClick={handleEditSave}
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}

export default SchedulePickup;