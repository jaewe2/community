// src/Inbox.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const isTyping = useRef(false);
  const [currentUID, setCurrentUID] = useState(null);

  useEffect(() => {
    const getUID = async () => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdTokenResult();
        setCurrentUID(token.claims.user_id || user.uid); // fallback to Firebase UID
      }
    };

    getUID();
    fetchMessages();

    const interval = setInterval(() => {
      if (!isTyping.current) fetchMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/api/messages/inbox/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const grouped = data.reduce((acc, msg) => {
        acc[msg.listing] = acc[msg.listing] || [];
        acc[msg.listing].push({
          ...msg,
          is_own: msg.sender_uid === currentUID || msg.sender === auth.currentUser.email,
        });
        return acc;
      }, {});
      setConversations(grouped);
      if (selectedListingId && grouped[selectedListingId]) {
        setSelectedMessages(grouped[selectedListingId]);
      }
    } catch (err) {
      toast.error("Could not load inbox");
    }
  };

  const handleSelectThread = (listingId) => {
    setSelectedListingId(listingId);
    setSelectedMessages(conversations[listingId]);
  };

  const handleReply = async (parentMessageId) => {
    if (!replyText.trim()) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/messages/${parentMessageId}/reply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyText }),
      });
      if (!res.ok) throw new Error("Reply failed");
      setReplyText("");
      isTyping.current = false;
      await fetchMessages(); // refresh after sending
    } catch (err) {
      toast.error("Failed to send reply");
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Left Sidebar - Recent */}
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarHeader}>Recent</h3>
        {Object.entries(conversations).map(([listingId, msgs]) => {
          const lastMsg = msgs[msgs.length - 1];
          return (
            <div
              key={listingId}
              onClick={() => handleSelectThread(listingId)}
              style={{
                ...styles.threadPreview,
                background: listingId === selectedListingId ? "#e0eaff" : "#f8f8f8",
              }}
            >
              <div style={styles.avatar}> {lastMsg.sender?.[0]?.toUpperCase() || "?"} </div>
              <div style={styles.threadText}>
                <p style={styles.sender}>{lastMsg.sender}</p>
                <p style={styles.preview}>{lastMsg.content.slice(0, 40)}...</p>
              </div>
              <p style={styles.date}>{new Date(lastMsg.created_at).toLocaleDateString()}</p>
            </div>
          );
        })}
      </div>

      {/* Right Panel - Chat Thread */}
      <div style={styles.chatPanel}>
        <h3 style={styles.heading}>Messaging</h3>
        <div style={styles.messagesArea}>
          {selectedMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                alignSelf: msg.is_own ? "flex-end" : "flex-start",
                background: msg.is_own ? "#2f6f8f" : "#eaeaea",
                color: msg.is_own ? "#fff" : "#000",
              }}
            >
              {msg.content}
              <div style={styles.timestamp}>{new Date(msg.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
        {selectedMessages.length > 0 && (
          <div style={styles.replyBar}>
            <textarea
              style={styles.textarea}
              placeholder="Type a message..."
              value={replyText}
              onChange={(e) => {
                isTyping.current = true;
                setReplyText(e.target.value);
              }}
            />
            <button
              onClick={() => handleReply(selectedMessages[selectedMessages.length - 1].id)}
              style={styles.sendBtn}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "calc(100vh - 60px)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: "300px",
    borderRight: "1px solid #ddd",
    overflowY: "auto",
    padding: "1rem",
    background: "#f2f2f2",
  },
  sidebarHeader: {
    fontSize: "1.3rem",
    color: "#007bff",
    marginBottom: "1rem",
  },
  threadPreview: {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#007bff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "1rem",
    marginRight: "10px",
  },
  threadText: {
    flex: 1,
  },
  sender: {
    fontWeight: "bold",
    fontSize: "0.95rem",
  },
  preview: {
    fontSize: "0.85rem",
    color: "#555",
  },
  date: {
    fontSize: "0.75rem",
    color: "#888",
    whiteSpace: "nowrap",
  },
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
  },
  heading: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "1rem",
    border: "1px solid #eee",
    borderRadius: "10px",
    background: "#fafafa",
  },
  messageBubble: {
    padding: "10px 14px",
    borderRadius: "16px",
    maxWidth: "60%",
    position: "relative",
  },
  timestamp: {
    fontSize: "0.7rem",
    marginTop: "6px",
    color: "#ccc",
  },
  replyBar: {
    display: "flex",
    marginTop: "1rem",
    gap: "10px",
  },
  textarea: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    resize: "none",
  },
  sendBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
