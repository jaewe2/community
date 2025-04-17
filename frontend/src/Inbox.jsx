// src/Inbox.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function Inbox() {
  const [conversations, setConversations] = useState({});
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const isTyping = useRef(false);
  const currentEmail = auth.currentUser?.email;

  useEffect(() => {
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

      // Group by listing, and mark each whether it's our own
      const grouped = {};
      data.forEach((msg) => {
        const lid = msg.listing;
        if (!grouped[lid]) {
          grouped[lid] = { title: msg.listing_title, messages: [] };
        }
        grouped[lid].messages.push({
          ...msg,
          isOwn: msg.sender === currentEmail,
        });
      });

      setConversations(grouped);
      // If the selected thread no longer exists, clear selection
      if (selectedListingId && !grouped[selectedListingId]) {
        setSelectedListingId(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load inbox");
    }
  };

  const handleSelectThread = (listingId) => {
    setSelectedListingId(listingId);
    setReplyText("");
  };

  const handleReply = async () => {
    const msgs = conversations[selectedListingId].messages;
    const last = msgs[msgs.length - 1];
    if (!replyText.trim()) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `http://127.0.0.1:8000/api/messages/${last.id}/reply/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: replyText }),
        }
      );
      if (!res.ok) throw new Error("Reply failed");
      setReplyText("");
      isTyping.current = false;
      await fetchMessages();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply");
    }
  };

  const threads = Object.entries(conversations);

  return (
    <div style={styles.wrapper}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarHeader}>Select a conversation</h3>
        {threads.map(([listingId, { title, messages }]) => {
          const last = messages[messages.length - 1];
          return (
            <div
              key={listingId}
              onClick={() => handleSelectThread(listingId)}
              style={{
                ...styles.threadPreview,
                background:
                  listingId.toString() === selectedListingId
                    ? "#e0eaff"
                    : "#f8f8f8",
              }}
            >
              <div style={styles.avatar}>
                {(last.isOwn ? currentEmail : last.sender)[0].toUpperCase()}
              </div>
              <div style={styles.threadText}>
                <p style={styles.listingTitle}>{title}</p>
                <p style={styles.preview}>
                  {last.isOwn ? "You: " : ""}
                  {last.content.length > 40
                    ? last.content.slice(0, 40) + "…"
                    : last.content}
                </p>
              </div>
              <p style={styles.date}>
                {new Date(last.created_at).toLocaleDateString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chat panel */}
      <div style={styles.chatPanel}>
        <h3 style={styles.heading}>
          {selectedListingId
            ? conversations[selectedListingId].title
            : "Conversations"}
        </h3>

        <div style={styles.messagesArea}>
          {selectedListingId &&
            // sort ascending by date, oldest first
            conversations[selectedListingId]
              .messages.slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at) - new Date(b.created_at)
              )
              .map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.messageBubble,
                    alignSelf: msg.isOwn ? "flex-end" : "flex-start",
                    background: msg.isOwn ? "#2f6f8f" : "#eaeaea",
                    color: msg.isOwn ? "#fff" : "#000",
                  }}
                >
                  <div style={styles.bubbleHeader}>
                    <strong>{msg.isOwn ? "You" : msg.sender}</strong>
                  </div>
                  <div>{msg.content}</div>
                  <div style={styles.timestamp}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
        </div>

        {selectedListingId && (
          <div style={styles.replyBar}>
            <textarea
              style={styles.textarea}
              placeholder="Type a message…"
              value={replyText}
              onChange={(e) => {
                isTyping.current = true;
                setReplyText(e.target.value);
              }}
            />
            <button style={styles.sendBtn} onClick={handleReply}>
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
    width: "280px",
    borderRight: "1px solid #ddd",
    overflowY: "auto",
    background: "#f2f2f2",
    padding: "1rem",
  },
  sidebarHeader: {
    marginBottom: "1rem",
    color: "#007bff",
    fontSize: "1.2rem",
  },
  threadPreview: {
    display: "flex",
    alignItems: "center",
    padding: "8px",
    marginBottom: "8px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#007bff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    marginRight: "8px",
  },
  threadText: {
    flex: 1,
  },
  listingTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: "bold",
  },
  preview: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#555",
  },
  date: {
    marginLeft: "8px",
    fontSize: "0.75rem",
    color: "#888",
  },
  chatPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "1rem",
  },
  heading: {
    fontSize: "1.4rem",
    marginBottom: "0.5rem",
    borderBottom: "1px solid #ddd",
    paddingBottom: "6px",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "1rem",
    border: "1px solid #eee",
    borderRadius: "8px",
    background: "#fafafa",
  },
  messageBubble: {
    maxWidth: "65%",
    padding: "8px 12px",
    borderRadius: "14px",
    position: "relative",
  },
  bubbleHeader: {
    fontSize: "0.75rem",
    marginBottom: "4px",
    opacity: 0.8,
  },
  timestamp: {
    fontSize: "0.7rem",
    marginTop: "6px",
    textAlign: "right",
    opacity: 0.7,
  },
  replyBar: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  textarea: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    resize: "none",
  },
  sendBtn: {
    background: "#007bff",
    color: "#fff",
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};


