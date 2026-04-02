import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { SocketProvider, useSocket } from "./context/SocketContext";
import PageLoader from "./components/PageLoader";

const Register           = lazy(() => import("./pages/Register"));
const Login              = lazy(() => import("./pages/Login"));
const VerifyOtp          = lazy(() => import("./pages/VerifyOtp"));
const ForgotPassword     = lazy(() => import("./pages/ForgotPassword"));
const Dashboard          = lazy(() => import("./pages/Dashboard"));
const Profile            = lazy(() => import("./pages/Profile"));
const Opportunities      = lazy(() => import("./pages/Opportunities"));
const CreateOpportunity  = lazy(() => import("./pages/CreateOpportunity"));
const OpportunityDetails = lazy(() => import("./pages/OpportunityDetails"));
const EditOpportunity    = lazy(() => import("./pages/EditOpportunity"));
const VolunteerDashboard = lazy(() => import("./pages/dashboard/VolunteerDashboard"));
const NgoDashboard       = lazy(() => import("./pages/dashboard/NgoDashboard"));
const AdminDashboard     = lazy(() => import("./pages/dashboard/AdminDashboard"));
const UsersPage          = lazy(() => import("./pages/admin/UsersPage"));
const Reports            = lazy(() => import("./pages/admin/Reports"));
const Moderation         = lazy(() => import("./pages/admin/Moderation"));
const PlatformControl    = lazy(() => import("./pages/admin/PlatformControl"));
const AdminSupport       = lazy(() => import("./pages/admin/AdminSupport"));
const SchedulePickup     = lazy(() => import("./pages/volunteer/SchedulePickup"));
const ManagePickups      = lazy(() => import("./pages/ngo/ManagePickups"));
const Applications       = lazy(() => import("./pages/ngo/Applications"));
const Messages           = lazy(() => import("./pages/Messages"));
const Settings           = lazy(() => import("./pages/Settings"));
const Support            = lazy(() => import("./pages/Support"));
const WasteStatistics    = lazy(() => import("./pages/volunteer/WasteStatistics"));

function RouteLoader({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {loading && <PageLoader />}
      {children}
    </>
  );
}

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
        <Suspense fallback={<PageLoader />}>
          <RouteLoader>
            <SuspensionWatcher />
            <Routes>
              <Route path="/"                element={<Navigate to="/register" />} />
              <Route path="/register"        element={<Register />} />
              <Route path="/login"           element={<Login />} />
              <Route path="/verify"          element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route path="/dashboard"           element={<Dashboard />} />
              <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
              <Route path="/ngo-dashboard"       element={<NgoDashboard />} />
              <Route path="/admin-dashboard"     element={<AdminDashboard />} />

              <Route path="/profile"              element={<Profile />} />
              <Route path="/opportunities"        element={<Opportunities />} />
              <Route path="/create-opportunity"   element={<CreateOpportunity />} />
              <Route path="/opportunity/:id"      element={<OpportunityDetails />} />
              <Route path="/edit-opportunity/:id" element={<EditOpportunity />} />

              <Route path="/users"           element={<UsersPage />} />
              <Route path="/reports"         element={<Reports />} />
              <Route path="/moderation"      element={<Moderation />} />
              <Route path="/platform-health" element={<PlatformControl />} />
              <Route path="/admin/support"   element={<AdminSupport />} />

              <Route path="/schedule"        element={<SchedulePickup />} />
              <Route path="/impact"          element={<WasteStatistics />} />

              <Route path="/manage-pickups"  element={<ManagePickups />} />
              <Route path="/applications"    element={<Applications />} />

              <Route path="/messages"  element={<Messages />} />
              <Route path="/settings"  element={<Settings />} />
              <Route path="/support"   element={<Support />} />
            </Routes>
          </RouteLoader>
        </Suspense>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;