import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../lib/storage";
import VolunteerDashboard from "./VolunteerDashboard";
import NGODashboard from "./NGODashboard";
import AdminDashboard from "./AdminDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUser();
    if (!userData) {
      navigate("/");
    } else {
      setUser(userData);
    }
    setLoading(false);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'ngo':
      return <NGODashboard />;
    case 'volunteer':
    default:
      return <VolunteerDashboard />;
  }
}
