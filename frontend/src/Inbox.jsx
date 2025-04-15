import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInboxMessages = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("You must be logged in");

        const res = await fetch("http://127.0.0.1:8000/api/messages/?inbox=true", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch inbox messages");

        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Inbox fetch error:", err);
        toast.error("Unable to load inbox");
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser) fetchInboxMessages();
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>Loading inbox...</p>;

  return (
    <div style={styles.container}>
      <h2>Inbox: Messages Sent to Your Listings</h2>
      {messages.length === 0 ? (
        <p>No messages received.</p>
      ) : (
        <ul style={styles.list}>
          {messages.map((msg) => (
            <li key={msg.id} style={styles.messageItem}>
              <p style={styles.content}>{msg.content}</p>
              <p style={styles.meta}>
                From: <strong>{msg.sender}</strong> | Listing:{" "}
                <Link to={`/listing/${msg.listing}`}>#{msg.listing}</Link> |{" "}
                {new Date(msg.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "2rem auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  messageItem: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
  },
  content: {
    fontSize: "1rem",
    color: "#333",
    marginBottom: "0.5rem",
  },
  meta: {
    fontSize: "0.85rem",
    color: "#888",
  },
};
