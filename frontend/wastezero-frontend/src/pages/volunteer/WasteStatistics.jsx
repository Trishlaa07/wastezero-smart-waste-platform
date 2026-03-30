import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "../../components/Layout";
import { Download, LayoutDashboard, User, Briefcase, FileText, Calendar, Trash2 } from "lucide-react";
import "../../styles/wasteStats.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

const WasteStatistics = () => {
  const [stats, setStats] = useState({
    applications: 0,
    impactPoints: 0,
    opportunitiesMatched: 0,
    pickupsScheduled: 0,
    wasteCollected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    try {
      // Fetch data to count records
      const [appsRes, oppsRes] = await Promise.all([
        axios.get(`${API}/api/applications/volunteer`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/api/opportunities/matched`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Mocking some other stats for visual impact
      setStats({
        applications: appsRes.data?.length || 0,
        opportunitiesMatched: oppsRes.data?.length || 0,
        pickupsScheduled: 0, // Mocked for now
        impactPoints: 1250, // Mocked
        wasteCollected: 45 // Mocked kg
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (reportName) => {
    // Basic CSV data related to the report name
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportName.includes("Impact")) {
      csvContent += "Metric,Value\nWaste Collected,45kg\nCarbon Saved,120kg\nEco Points,1250\n";
    } else if (reportName.includes("Contribution")) {
      csvContent += "Date,Item,Weight,Receiver\n2024-03-20,Plastic Bottles,5kg,Green NGO\n2024-03-18,Paper Waste,10kg,Eco Save\n";
    } else if (reportName.includes("Engagement")) {
      csvContent += "NGO Name,Interaction Type,Date\nGreen Earth,Opportunity Matched,2024-03-15\nSave Ocean,Message Sent,2024-03-10\n";
    } else if (reportName.includes("Applications")) {
      csvContent += "Opportunity,Status,Date\nBeach Cleanup,Accepted,2024-03-12\nTree Plantation,Pending,2024-03-19\n";
    } else {
      csvContent += "ID,Time,Location,Status\nSCH-001,10:00 AM,Central Park,Scheduled\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName.toLocaleLowerCase().replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ReportCard = ({ title, description, records, icon, color, downloadLabel = "Download CSV" }) => (
    <div className={`stat-report-card ${color}`}>
      <div className="card-top">
        <div className="icon-wrapper">
          {icon}
        </div>
        <button className="download-btn" onClick={() => handleDownload(title)}>
          <Download size={14} /> {downloadLabel}
        </button>
      </div>
      <div className="card-content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="card-footer">
        <FileText size={14} className="footer-icon" />
        <span>{records}</span>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="vol-container">
        <div className="vol-header">
          <div>
            <h2 className="dashboard-title">Waste Statistics & Reports</h2>
            <p className="dashboard-welcome">Track your environmental contribution and platform engagement metrics.</p>
          </div>
        </div>

        {loading ? (
          <p>Loading statistics...</p>
        ) : (
          <div className="stats-grid">
            <ReportCard 
              title="Individual Impact Report"
              description="Your total environmental impact scores - waste collected, Carbon saved, and eco-points."
              records="Aggregated metrics"
              icon={<LayoutDashboard size={20} />}
              color="purple"
            />
            
            <ReportCard 
              title="Contribution History"
              description="Detailed record of all your waste collection activities including items and NGO receivers."
              records={`${stats.wasteCollected} kg collected`}
              icon={<Trash2 size={20} />}
              color="blue"
            />

            <ReportCard 
              title="Community Engagement Report"
              description="Summary of NGOs you've interacted with and opportunities you've successfully matched."
              records={`${stats.opportunitiesMatched} records`}
              icon={<Briefcase size={20} />}
              color="green"
            />

            <ReportCard 
              title="Volunteer Applications Report"
              description="Current status and historical data of all your volunteer applications to various NGOs."
              records={`${stats.applications} records`}
              icon={<User size={20} />}
              color="orange"
            />

            <ReportCard 
              title="Pickup Schedules Report"
              description="All upcoming and completed waste pickup schedules with timing and agent details."
              records={`${stats.pickupsScheduled} records`}
              icon={<Calendar size={20} />}
              color="cyan"
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WasteStatistics;
