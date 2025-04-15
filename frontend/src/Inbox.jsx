// src/Inbox.jsx
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import { FaTrash, FaReply } from "react-icons/fa";

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBox, setReplyBox] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("http://127.0.0.1:8000/api/messages/inbox/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load inbox messages");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error(err);
        toast.error("Could not load inbox");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const handleDelete = async (id) => {
    const confirm = window.confirm("Delete this message?");
    if (!confirm) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/messages/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Delete failed");
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Message deleted");
    } catch (err) {
      console.error(err);
      toast.error("Error deleting message");
    }
  };

  const handleReply = async (listingId) => {
    if (!replyText.trim()) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/api/messages/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listing: listingId, content: replyText }),
      });

      if (!res.ok) throw new Error("Reply failed");
      toast.success("Reply sent");
      setReplyBox(null);
      setReplyText("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    }
  };

  const sortedMessages = [...messages].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
  });

  // Group messages by listing_id
  const groupedMessages = sortedMessages.reduce((acc, message) => {
    (acc[message.listing] = acc[message.listing] || []).push(message);
    return acc;
  }, {});

  if (loading) return <p style={{ padding: "2rem" }}>Loading inbox...</p>;
  if (messages.length === 0) return <p style={{ padding: "2rem" }}>No new messages.</p>;

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Inbox</h2>
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
        {Object.entries(groupedMessages).map(([listingId, listingMessages]) => (
          <li key={listingId} style={styles.card}>
            <h3>Listing ID: {listingId}</h3>
            {listingMessages.map((msg) => (
              <div key={msg.id} style={styles.message}>
                <p style={styles.title}>{msg.listing_title || "Untitled Listing"}</p>
                <p><strong>From:</strong> {msg.sender}</p>
                <p><strong>Message:</strong> {msg.content}</p>
                <p style={styles.meta}>Received on {new Date(msg.created_at).toLocaleString()}</p>

                <div style={styles.actions}>
                  <button onClick={() => setReplyBox(msg.id)} style={styles.replyBtn}>
                    <FaReply /> Reply
                  </button>
                  <button onClick={() => handleDelete(msg.id)} style={styles.deleteBtn}>
                    <FaTrash /> Delete
                  </button>
                </div>

                {replyBox === msg.id && (
                  <div style={styles.replyBox}>
                    <textarea
                      rows="3"
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={styles.textarea}
                    />
                    <button onClick={() => handleReply(msg.listing)} style={styles.sendBtn}>
                      Send Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
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
    marginBottom: "1rem",
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
  },
  card: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
    marginBottom: "1rem",
  },
  message: {
    padding: "1rem",
    borderBottom: "1px solid #ddd",
    marginBottom: "1rem",
  },
  title: {
    fontWeight: "bold",
    fontSize: "1rem",
    color: "#222",
  },
  meta: {
    fontSize: "0.85rem",
    color: "#666",
  },
  actions: {
    display: "flex",
    gap: "10px",
    marginTop: "0.8rem",
  },
  replyBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  replyBox: {
    marginTop: "1rem",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    resize: "vertical",
    marginBottom: "0.5rem",
  },
  sendBtn: {
    background: "#28a745",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
};
