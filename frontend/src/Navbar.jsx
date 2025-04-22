// src/Navbar.jsx
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useAuth } from "./Auth/AuthContext";

export default function Navbar() {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

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

        {/* ← NEW My Ads link for everyone */}
        <Link to="/my-ads" style={styles.link}>My Ads</Link>

        {user.is_buyer && <Link to="/favorites" style={styles.link}>Favorites</Link>}
        <Link to="/inbox" style={styles.link}>Chat Inbox</Link>
        <Link to="/settings" style={styles.link}>Settings</Link>
        {user.is_admin && <Link to="/admin" style={styles.link}>Admin Panel</Link>}
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
        <span style={styles.user}>Hello, {user.email}</span>
        <button onClick={handleLogout} style={styles.logout}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { padding: "10px 20px", borderBottom: "1px solid #ccc", backgroundColor: "#f8f8f8",
         display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" },
  left: { display: "flex", gap: "15px" },
  right: { display: "flex", alignItems: "center", gap: "15px" },
  link: { textDecoration: "none", color: "#007bff", fontWeight: "bold" },
  user: { fontSize: "0.9rem", color: "#333" },
  logout: { background: "#dc3545", color: "#fff", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" },
  searchForm: { display: "flex", alignItems: "center", gap: "8px" },
  searchInput: { padding: "6px", borderRadius: "4px", border: "1px solid #ccc", minWidth: "180px" },
  searchButton: { background: "#007bff", color: "#fff", padding: "6px 10px", border: "none", borderRadius: "4px", cursor: "pointer" },
};

