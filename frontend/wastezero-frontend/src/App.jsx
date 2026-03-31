import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SocketProvider, useSocket } from "./context/SocketContext";
import { useEffect } from "react";

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Opportunities from "./pages/Opportunities.jsx";
import CreateOpportunity from "./pages/CreateOpportunity.jsx";
import OpportunityDetails from "./pages/OpportunityDetails.jsx";
import EditOpportunity from "./pages/EditOpportunity.jsx";

import VolunteerDashboard from "./pages/dashboard/VolunteerDashboard.jsx";
import NgoDashboard from "./pages/dashboard/NgoDashboard.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";

import UsersPage from "./pages/admin/UsersPage";
import Reports from "./pages/admin/Reports";
import Moderation from "./pages/admin/Moderation";
import PlatformControl from "./pages/admin/PlatformControl";
import AdminSupport from "./pages/admin/AdminSupport";

import SchedulePickup from "./pages/volunteer/SchedulePickup";
import ManagePickups from "./pages/ngo/ManagePickups";   // ← added

import Applications from "./pages/ngo/Applications";
import Messages from "./pages/Messages";

import Settings from "./pages/Settings";
import Support from "./pages/Support";
import WasteStatistics from "./pages/volunteer/WasteStatistics";

/* ─────────────────────────────────────────
   Listens for auto-suspension and kicks the
   currently logged-in user out immediately
   if it is their account that was suspended.
───────────────────────────────────────────*/
function SuspensionWatcher() {
  const socket   = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handleAutoSuspend = ({ userId }) => {
      const stored = localStorage.getItem("user");
      if (!stored) return;

      try {
        const me          = JSON.parse(stored);
        const meId        = (me._id || me.id)?.toString();
        const suspendedId = userId?.toString();

        if (meId === suspendedId) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", {
            replace: true,
            state: {
              suspended: true,
              reason: "Your account has been automatically suspended due to multiple reports.",
            },
          });
        }
      } catch (e) {
        console.error("SuspensionWatcher parse error:", e);
      }
    };

    socket.on("userAutoSuspended", handleAutoSuspend);
    return () => socket.off("userAutoSuspended", handleAutoSuspend);
  }, [socket, navigate]);

  return null;
}

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        {/* Must be inside BrowserRouter so useNavigate works */}
        <SuspensionWatcher />

        <Routes>
          {/* Auth */}
          <Route path="/"                element={<Navigate to="/register" />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/verify"          element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Role-based dashboard redirect */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Role-specific dashboards */}
          <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
          <Route path="/ngo-dashboard"       element={<NgoDashboard />} />
          <Route path="/admin-dashboard"     element={<AdminDashboard />} />

          {/* Profile & Opportunities */}
          <Route path="/profile"              element={<Profile />} />
          <Route path="/opportunities"        element={<Opportunities />} />
          <Route path="/create-opportunity"   element={<CreateOpportunity />} />
          <Route path="/opportunity/:id"      element={<OpportunityDetails />} />
          <Route path="/edit-opportunity/:id" element={<EditOpportunity />} />

          {/* Admin */}
          <Route path="/users"           element={<UsersPage />} />
          <Route path="/reports"         element={<Reports />} />
          <Route path="/moderation"      element={<Moderation />} />
          <Route path="/platform-health" element={<PlatformControl />} />
          <Route path="/admin/support" element={<AdminSupport />} />

          {/* Volunteer */}
          <Route path="/schedule"        element={<SchedulePickup />} />
          <Route path="/impact"          element={<WasteStatistics />} />

          {/* NGO */}
          <Route path="/manage-pickups"  element={<ManagePickups />} />   {/* ← added */}
          <Route path="/applications"    element={<Applications />} />

          {/* Shared */}
          <Route path="/messages"  element={<Messages />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/support"   element={<Support />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;