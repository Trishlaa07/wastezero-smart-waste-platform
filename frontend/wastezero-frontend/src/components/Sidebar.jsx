import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, CalendarDays, Briefcase,
  MessageCircle, Sprout, User, Settings,
  HelpCircle, Shield, Users, BarChart3,
  Trash2, PanelLeftClose, PanelLeftOpen,
  ChevronRight, Menu, X, PackageCheck,
} from "lucide-react";
import WasteZeroLogo from "../components/WasteZeroLogo";
import "../styles/Sidebar.css";

function Sidebar() {
  const location  = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role;
  const name = user?.name;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItem = (path, icon, label) => {
    const active = location.pathname === path;
    return (
      <Link
        key={path}
        to={path}
        className={`sidebar-link ${active ? "active" : ""}`}
        title={collapsed ? label : ""}
      >
        <span className="sidebar-icon">{icon}</span>
        <span className="sidebar-label">{label}</span>
        {active && <ChevronRight size={14} className="sidebar-arrow" />}
      </Link>
    );
  };

  const sidebarContent = (
    <>
      {/* ── BRAND ── */}
      <div className="sidebar-brand">
        <WasteZeroLogo size={32} />
        <h2 className="brand-text">Waste<span>Zero</span></h2>
        <button
          className="collapse-btn desktop-only"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
        <button
          className="collapse-btn mobile-only"
          onClick={() => setMobileOpen(false)}
        >
          <X size={15} />
        </button>
      </div>

      {/* ── USER CARD ── */}
      <div className="user-card">
        <div className="user-avatar">
          {name ? name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="user-info">
          <h3>{name || "User"}</h3>
          <span className={`role-badge role-${role}`}>
            {role?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── MAIN NAV ── */}
      <nav className="sidebar-nav">
        {role === "volunteer" && (
          <>
            <p className="menu-title">Main Menu</p>
            {menuItem("/volunteer-dashboard", <LayoutDashboard size={18} />, "Dashboard")}
            {menuItem("/schedule",            <CalendarDays    size={18} />, "Schedule Pickup")}
            {menuItem("/opportunities",       <Briefcase       size={18} />, "Opportunities")}
            {menuItem("/messages",            <MessageCircle   size={18} />, "Chat")}
            {menuItem("/impact",              <Sprout          size={18} />, "Waste Statistics")}
          </>
        )}
        {role === "ngo" && (
          <>
            <p className="menu-title">Main Menu</p>
            {menuItem("/ngo-dashboard",      <LayoutDashboard size={18} />, "Dashboard")}
            {menuItem("/manage-pickups",     <PackageCheck    size={18} />, "Manage Pickups")}
            {menuItem("/opportunities",      <Briefcase       size={18} />, "Manage Opportunities")}
            {menuItem("/applications",       <Users           size={18} />, "Applications")}
            {menuItem("/messages",           <MessageCircle   size={18} />, "Chat")}
          </>
        )}
        {role === "admin" && (
          <>
            <p className="menu-title">Main Menu</p>
            {menuItem("/admin-dashboard",  <LayoutDashboard size={18} />, "Dashboard")}
            {menuItem("/users",            <Users           size={18} />, "Monitor Users")}
            {menuItem("/reports",          <BarChart3       size={18} />, "Reports & Analytics")}
            {menuItem("/moderation",       <Trash2          size={18} />, "Remove Bad Posts")}
            {menuItem("/platform-health",  <Shield          size={18} />, "Platform Control")}
            {menuItem("/admin/support",    <MessageCircle   size={18} />, "Support Requests")}
          </>
        )}
      </nav>

      {/* ── BOTTOM / ACCOUNT ── */}
      <div className="sidebar-bottom">
        <div className="sidebar-bottom-divider" />
        <p className="menu-title">Account</p>
        {menuItem("/profile",  <User       size={18} />, "My Profile")}
        {menuItem("/settings", <Settings   size={18} />, "Settings")}
        {menuItem("/support",  <HelpCircle size={18} />, "Help & Support")}
      </div>
    </>
  );

  return (
    <>
      <button
        className="mobile-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {sidebarContent}
      </div>
    </>
  );
}

export default Sidebar;