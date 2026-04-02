import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import axios from "axios";
import { useSocket } from "../context/SocketContext";
import {
  Calendar, Clock, MapPin, Pencil, Trash2,
  MessageCircle, MoreVertical, Flag, Users,
  CheckCircle, AlertCircle, X
} from "lucide-react";
import "../styles/OpportunityDetails.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function OpportunityDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const socket   = useSocket();

  const token = localStorage.getItem("token");

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }, []);

  const [opportunity,         setOpportunity]         = useState(null);
  const [applied,             setApplied]             = useState(false);
  const [applicationStatus,   setApplicationStatus]   = useState(null);
  const [loadingApplication,  setLoadingApplication]  = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApplyModal,  setShowApplyModal]  = useState(false);
  const [showMenu,        setShowMenu]        = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason,    setReportReason]    = useState("");
  const [reportText,      setReportText]      = useState("");

  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess,    setReportSuccess]    = useState(false);
  const [reportError,      setReportError]      = useState("");

  /* ── Derived ── */
  const spotsLeft = opportunity
    ? Math.max(0, (opportunity.volunteersNeeded || 1) - (opportunity.applicantCount || 0))
    : null;

  const isFull = spotsLeft === 0;

  /* ── Fetch opportunity + check application ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${API}/api/opportunities/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setOpportunity(res.data);

        if (user?.role === "volunteer") {
          const checkRes = await axios.get(
            `${API}/api/applications/check/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (checkRes.data.applied) {
            setApplied(true);
            setApplicationStatus(checkRes.data.status);
          }
        }

      } catch (error) {
        console.log(error);
      } finally {
        setLoadingApplication(false);
      }
    };

    fetchData();
  }, [id, token, user?.role]);

  /* ── Real-time: applicant count update ── */
  useEffect(() => {
    if (!socket) return;

    const handleCountUpdate = ({ opportunityId, applicantCount }) => {
      if (opportunityId === id || opportunityId === id.toString()) {
        setOpportunity(prev =>
          prev ? { ...prev, applicantCount } : prev
        );
      }
    };

    socket.on("opportunityCountUpdated", handleCountUpdate);
    return () => socket.off("opportunityCountUpdated", handleCountUpdate);
  }, [socket, id]);

  /* ── Delete ── */
  const handleDelete = async () => {
    try {
      await axios.delete(
        `${API}/api/opportunities/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate("/opportunities");
    } catch {
      alert("Delete failed");
    }
  };

  /* ── Apply ── */
  const applyToOpportunity = async () => {
    try {
      await axios.post(
        `${API}/api/applications/apply`,
        { opportunityId: opportunity._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplied(true);
      setApplicationStatus("pending");
      setOpportunity(prev => ({
        ...prev,
        applicantCount: (prev.applicantCount || 0) + 1,
      }));
    } catch (error) {
      alert(error.response?.data?.message || "Error applying");
    }
  };

  /* ── Chat ── */
  const openChat = () => {
    navigate("/messages", {
      state: {
        userId:        opportunity.ngo?._id,
        userName:      opportunity.ngo?.name,
        opportunityId: opportunity._id,
      },
    });
  };

  /* ── Report ── */
  const submitReport = async () => {
    if (!reportReason) {
      setReportError("Please select a reason.");
      return;
    }

    setReportSubmitting(true);
    setReportError("");

    try {
      await axios.post(
        `${API}/api/reports`,
        {
          opportunityId: opportunity._id,
          reason:        reportReason,
          description:   reportText,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReportSuccess(true);
    } catch (err) {
      setReportError(err.response?.data?.message || "Error submitting report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  /* ── Close report modal & reset all state ── */
  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason("");
    setReportText("");
    setReportSuccess(false);
    setReportError("");
    setReportSubmitting(false);
  };

  if (!opportunity) {
    return <Layout><p style={{ padding: 40 }}>Loading...</p></Layout>;
  }

  return (
    <Layout>
      <div className="details-container">

        <div className="details-header">
          <h2>{opportunity.title}</h2>
          <p className="subtitle">Volunteer opportunity details</p>
        </div>

        <div className="details-grid">

          {/* LEFT */}
          <div>
            <div className="image-wrapper">
              <img
                src={
                  opportunity.image || "/no-image.png"
                }
                alt="opportunity"
                className="details-image"
              />

              {/* 3-DOT MENU */}
              <div className="menu-wrapper">
                <MoreVertical
                  size={22}
                  className="menu-icon"
                  onClick={() => setShowMenu(!showMenu)}
                />
                {showMenu && (
                  <div className="menu-dropdown">
                    <div
                      className="menu-item"
                      onClick={() => {
                        setShowReportModal(true);
                        setShowMenu(false);
                      }}
                    >
                      <Flag size={16} /> Report
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3>Description</h3>
              <p>{opportunity.description}</p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="details-right">

            <h3>Opportunity Info</h3>

            <div className="meta-item">
              <Calendar size={16} />
              <span>{opportunity.date?.slice(0, 10)}</span>
            </div>

            <div className="meta-item">
              <Clock size={16} />
              <span>{opportunity.duration}</span>
            </div>

            <div className="meta-item">
              <MapPin size={16} />
              <span>{opportunity.location}</span>
            </div>

            <div className="meta-item">
              <Users size={16} />
              <span>
                {opportunity.applicantCount || 0} applied
                {" · "}
                {opportunity.volunteersNeeded || 1} needed
              </span>
            </div>

            {/* SPOTS PROGRESS BAR */}
            <div className="spots-bar-wrapper">
              <div className="spots-bar">
                <div
                  className="spots-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      ((opportunity.applicantCount || 0) /
                        (opportunity.volunteersNeeded || 1)) * 100
                    )}%`,
                    background: isFull ? "#e03131" : "#1D9E75",
                  }}
                />
              </div>
              <span className={`spots-label ${isFull ? "full" : ""}`}>
                {isFull
                  ? "No spots left"
                  : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining`}
              </span>
            </div>

            {/* NGO BOX */}
            <div className="ngo-box">
              <div className="ngo-header">
                <div>
                  <p className="ngo-label">Organised by</p>
                  <p className="ngo-name">
                    {opportunity.ngo?.name || "NGO"}
                  </p>
                </div>
                {user?.role === "volunteer" &&
                  applied &&
                  applicationStatus === "accepted" && (
                    <button className="chat-btn-small" onClick={openChat}>
                      <MessageCircle size={16} /> Chat
                    </button>
                  )}
              </div>
            </div>

            {/* SKILLS */}
            {opportunity.requiredSkills?.length > 0 && (
              <>
                <h4 className="skills-heading">Required Skills</h4>
                <div className="skills-list">
                  {opportunity.requiredSkills.map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </>
            )}

            {/* APPLY BUTTON — volunteers only */}
            {user?.role === "volunteer" && !loadingApplication && (
              <div className="apply-section">
                {applied ? (
                  <button
                    className={`apply-btn ${applicationStatus}`}
                    disabled
                  >
                    {applicationStatus === "pending"  && "Application Pending"}
                    {applicationStatus === "accepted" && "Application Accepted"}
                    {applicationStatus === "rejected" && "Application Rejected"}
                  </button>
                ) : (
                  <button
                    className="apply-btn"
                    disabled={isFull || opportunity.status === "Closed"}
                    onClick={() => setShowApplyModal(true)}
                  >
                    {isFull ? "Fully Booked" : "Apply Now"}
                  </button>
                )}
              </div>
            )}

            {/* EDIT / DELETE — NGO + admin */}
            {(user?.role === "admin" || user?.role === "ngo") && (
              <div className="details-actions">
                <button
                  className="edit-btn"
                  onClick={() =>
                    navigate(`/edit-opportunity/${opportunity._id}`)
                  }
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  className="delete-btn"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            )}

          </div>
        </div>

        {/* DELETE MODAL */}
        {showDeleteModal && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <h3>Delete Opportunity</h3>
              <p>Are you sure? This action cannot be undone.</p>
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className="confirm-delete-btn" onClick={handleDelete}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPLY MODAL */}
        {showApplyModal && (
          <div className="delete-modal-overlay">
            <div className="delete-modal">
              <h3>Apply for Opportunity</h3>
              <p>Are you sure you want to apply for this volunteer opportunity?</p>
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </button>
                <button
                  className="confirm-delete-btn"
                  onClick={() => {
                    applyToOpportunity();
                    setShowApplyModal(false);
                  }}
                >
                  Yes, Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── REPORT MODAL ── */}
        {showReportModal && (
          /* ✅ Click on overlay closes modal */
          <div className="delete-modal-overlay" onClick={closeReportModal}>
            <div
              className="delete-modal report-modal-inner"
              onClick={e => e.stopPropagation()} // prevent overlay click from bubbling
            >
              {/* ✅ X close button — always visible top-right */}
              <button className="report-modal-close" onClick={closeReportModal}>
                <X size={18} />
              </button>

              {reportSuccess ? (
                /* SUCCESS STATE */
                <div className="report-success">
                  <CheckCircle size={44} className="report-success-icon" />
                  <h3>Report Submitted</h3>
                  <p>Thank you. Our team will review this opportunity shortly.</p>
                </div>
              ) : (
                /* FORM STATE */
                <>
                  <h3>Report Opportunity</h3>

                  <select
                    value={reportReason}
                    onChange={e => {
                      setReportReason(e.target.value);
                      setReportError("");
                    }}
                    className="report-select"
                  >
                    <option value="">Select reason</option>
                    <option>Spam</option>
                    <option>Fake Opportunity</option>
                    <option>Inappropriate Content</option>
                    <option>Safety Concern</option>
                    <option>Other</option>
                  </select>

                  <textarea
                    placeholder="Additional details (optional)"
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    className="report-textarea"
                  />

                  {reportError && (
                    <div className="report-error">
                      <AlertCircle size={14} />
                      <span>{reportError}</span>
                    </div>
                  )}

                  <div className="modal-buttons">
                    <button
                      className="cancel-btn"
                      onClick={closeReportModal}
                      disabled={reportSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      className="confirm-delete-btn"
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

      </div>
    </Layout>
  );
}

export default OpportunityDetails;
