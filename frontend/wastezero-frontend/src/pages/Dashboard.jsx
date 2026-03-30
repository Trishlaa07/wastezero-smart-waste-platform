import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      navigate("/login");
      return;
    }

    // Redirect based on role
    if (user.role === "volunteer") navigate("/volunteer-dashboard");
    else if (user.role === "ngo") navigate("/ngo-dashboard");
    else if (user.role === "admin") navigate("/admin-dashboard");
    else navigate("/login"); // fallback
  }, [navigate]);

  return null; // this page only redirects
}

export default Dashboard;