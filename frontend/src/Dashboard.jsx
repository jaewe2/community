// src/Dashboard.jsx
import React from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth); // ✅ Firebase sign out
      toast.info("You have been logged out.", {
        className: "custom-toast",
        icon: "👋",
      });
      navigate("/login"); // ✅ Redirect to login
    } catch (error) {
      toast.error(`Logout failed: ${error.message}`, {
        className: "custom-toast custom-toast-error",
        icon: "❌",
      });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Dashboard</h2>
      <p style={styles.welcome}>Welcome, {user?.email}</p>
      <button onClick={handleLogout} style={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "1rem",
  },
  welcome: {
    fontSize: "1rem",
    color: "#333",
    marginBottom: "2rem",
  },
  logoutButton: {
    padding: "10px 20px",
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
