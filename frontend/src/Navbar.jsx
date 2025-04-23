// src/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useAuth } from "./Auth/AuthContext";
import { FaBell, FaEnvelope } from "react-icons/fa";

export default function Navbar() {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function loadCounts() {
      const current = auth.currentUser;
      if (!current) return;

      const token = await current.getIdToken();

      // notifications summary
      const notRes = await fetch("/api/analytics/user/notifications/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (notRes.ok && mounted) {
        const { unreadMessages, newOrdersToday } = await notRes.json();
        setNotifCount(unreadMessages + newOrdersToday);
      }

      // unread messages
      const msgRes = await fetch("/api/messages/inbox/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (msgRes.ok && mounted) {
        const data = await msgRes.json();
        setMsgCount(data.filter((m) => !m.read).length);
      }
    }

    loadCounts();
    const intervalId = setInterval(loadCounts, 60_000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [user]);

  if (loading || !user) return null;
  if (["/login", "/register"].includes(location.pathname)) return null;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("You have been logged out.", { icon: "👋" });
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (q) {
      navigate(`/listings?search=${encodeURIComponent(q)}`);
      setSearchTerm("");
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link to="/dashboard" style={styles.link}>Home</Link>
        <Link to="/listings" style={styles.link}>Browse Listings</Link>
        <Link to="/post" style={styles.link}>Post an Ad</Link>
        <Link to="/my-ads" style={styles.link}>My Ads</Link>
        {user.is_buyer && <Link to="/favorites" style={styles.link}>Favorites</Link>}
        <Link to="/inbox" style={styles.link}>Inbox</Link>
        <Link to="/orders" style={styles.link}>My Orders</Link>
        <Link to="/settings" style={styles.link}>Settings</Link>
        {user.is_admin && <Link to="/admin" style={styles.link}>Admin</Link>}
      </div>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          placeholder="Search listings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>Search</button>
      </form>

      <div style={styles.right}>
        {/* Unread-messages icon */}
        <Link to="/inbox" style={styles.iconButton} title="Unread Messages">
          <FaEnvelope size={18} />
          {msgCount > 0 && <span style={styles.badge}>{msgCount}</span>}
        </Link>

        {/* Bell now points at the Notifications page */}
        <Link to="/notifications" style={styles.iconButton} title="Notifications">
          <FaBell size={20} />
          {notifCount > 0 && <span style={styles.badge}>{notifCount}</span>}
        </Link>

        <span style={styles.user}>Hello, {user.email}</span>
        <button onClick={handleLogout} style={styles.logout}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    padding: "10px 20px",
    borderBottom: "1px solid #ccc",
    backgroundColor: "#f8f8f8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  left: { display: "flex", gap: "15px" },
  right: { display: "flex", alignItems: "center", gap: "15px" },
  link: { textDecoration: "none", color: "#007bff", fontWeight: "bold" },
  searchForm: { display: "flex", alignItems: "center", gap: "8px" },
  searchInput: {
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    minWidth: "180px",
  },
  searchButton: {
    background: "#007bff",
    color: "#fff",
    padding: "6px 10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  iconButton: { position: "relative", color: "#333", textDecoration: "none" },
  badge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "#dc3545",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "0.7rem",
    lineHeight: 1,
  },
  user: { fontSize: "0.9rem", color: "#333" },
  logout: {
    background: "#dc3545",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};
