// src/MyMessages.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import { FaTrash, FaChevronDown, FaChevronUp } from "react-icons/fa";

export default function MyMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [sortOrder, setSortOrder] = useState("newest");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          toast.error("You must be logged in to view messages.");
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/api/messages/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load messages");

        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Error fetching messages:", err);
        toast.error("Could not load your messages.");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this message?");
    if (!confirm) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/messages/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete message");

      setMessages((prev) => prev.filter((msg) => msg.id !== id));
      toast.success("Message deleted");
    } catch (err) {
      console.error("Error deleting message:", err);
      toast.error("Failed to delete message");
    }
  };

  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
  });

  if (loading) return <p style={{ padding: "2rem" }}>Loading messages...</p>;
  if (messages.length === 0) return <p style={{ padding: "2rem" }}>You haven’t sent any messages yet.</p>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>My Messages</h2>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={styles.sortSelect}
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
        </select>
      </div>
      <ul style={styles.list}>
        {sortedMessages.map((msg) => (
          <li key={msg.id} style={styles.card}>
            <div style={styles.row}>
              <div>
                <p
                  style={styles.titleLink}
                  onClick={() => navigate(`/listing/${msg.listing}`)}
                  title="View Listing"
                >
                  {msg.listing_title || "Untitled Listing"}
                </p>
                <p style={styles.meta}>Sent on {new Date(msg.created_at).toLocaleString()}</p>
              </div>
              <div style={styles.actions}>
                <button
                  onClick={() => setExpanded((prev) => (prev === msg.id ? null : msg.id))}
                  style={styles.expandButton}
                >
                  {expanded === msg.id ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                <button
                  onClick={() => handleDelete(msg.id)}
                  style={styles.deleteButton}
                  title="Delete Message"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            {expanded === msg.id && (
              <div style={styles.detailBox}>
                <p>{msg.content}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "2rem auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  heading: {
    fontSize: "1.8rem",
    color: "#007bff",
  },
  sortSelect: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "0.9rem",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  card: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
    marginBottom: "1rem",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleLink: {
    fontWeight: "bold",
    fontSize: "1rem",
    color: "#007bff",
    cursor: "pointer",
    textDecoration: "underline",
  },
  meta: {
    fontSize: "0.85rem",
    color: "#666",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  expandButton: {
    background: "#eee",
    border: "none",
    padding: "6px 8px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteButton: {
    background: "#dc3545",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#fff",
  },
  detailBox: {
    marginTop: "0.8rem",
    padding: "0.8rem",
    backgroundColor: "#f9f9f9",
    borderRadius: "6px",
  },
};
