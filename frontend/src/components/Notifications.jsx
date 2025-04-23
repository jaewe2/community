// src/components/Notifications.jsx
import React, { useState, useEffect } from "react";
import { FaEnvelope, FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();

      // 1) Notification counts (messages + orders)
      const notifRes = await fetch("/api/analytics/user/notifications/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!notifRes.ok) throw new Error("Failed to load notification summary");
      const { unreadMessages: um, newOrdersToday: no } = await notifRes.json();
      setUnreadCount(um);
      setNewOrdersCount(no);

      // 2) Fetch inbox, extract unread message details
      const inboxRes = await fetch("/api/messages/inbox/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!inboxRes.ok) throw new Error("Failed to load messages");
      const inboxData = await inboxRes.json();
      // grab only unread, limit to 5, sorted newest first
      const unread = inboxData
        .filter((m) => !m.read)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      setUnreadMessages(unread);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Could not load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return <p style={styles.loading}>Loading notifications…</p>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Your Notifications</h2>

      <section style={styles.section}>
        <div style={styles.header}>
          <FaEnvelope style={styles.icon} />{" "}
          <span style={styles.title}>Unread Messages ({unreadCount})</span>
        </div>

        {unreadMessages.length > 0 ? (
          <ul style={styles.list}>
            {unreadMessages.map((msg) => (
              <li key={msg.id} style={styles.listItem}>
                <strong>{msg.sender}</strong> on <em>{msg.listing_title}</em>
                <div style={styles.snippet}>
                  {msg.content.length > 60
                    ? msg.content.slice(0, 57) + "…"
                    : msg.content}
                </div>
                <small style={styles.timestamp}>
                  {new Date(msg.created_at).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p style={styles.empty}>No unread messages.</p>
        )}

        <button
          style={styles.button}
          onClick={() => navigate("/inbox")}
        >
          Go to Inbox
        </button>
      </section>

      <section style={styles.section}>
        <div style={styles.header}>
          <FaBell style={styles.icon} />{" "}
          <span style={styles.title}>New Orders Today ({newOrdersCount})</span>
        </div>

        {newOrdersCount > 0 ? (
          <p style={styles.info}>
            You have <strong>{newOrdersCount}</strong> new order
            {newOrdersCount > 1 ? "s" : ""} placed on your listings today.
          </p>
        ) : (
          <p style={styles.empty}>No new orders today.</p>
        )}

        <button
          style={styles.button}
          onClick={() => navigate("/sales")}
        >
          View Your Sales
        </button>
      </section>
    </div>
  );
}

const styles = {
  loading: {
    padding: "2rem",
    textAlign: "center",
  },
  container: {
    maxWidth: "700px",
    margin: "2rem auto",
    padding: "1rem",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
    textAlign: "center",
  },
  section: {
    marginBottom: "2rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  icon: {
    marginRight: "8px",
    color: "#5A2D76",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: "600",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "0.5rem 0",
  },
  listItem: {
    padding: "0.5rem 0",
    borderBottom: "1px solid #eee",
  },
  snippet: {
    color: "#555",
    margin: "0.25rem 0",
  },
  timestamp: {
    color: "#888",
    fontSize: "0.8rem",
  },
  empty: {
    color: "#888",
    fontStyle: "italic",
  },
  info: {
    margin: "0.5rem 0",
    fontSize: "1rem",
  },
  button: {
    marginTop: "0.5rem",
    background: "#5A2D76",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};
