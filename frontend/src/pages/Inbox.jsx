// src/Inbox.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { FaTrash } from "react-icons/fa";

export default function Inbox() {
  const [conversations, setConversations] = useState({});
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const isTyping = useRef(false);
  const currentEmail = auth.currentUser?.email;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const iv = setInterval(() => {
      if (!isTyping.current) fetchMessages();
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversations, selectedListingId]);

  async function fetchMessages() {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/messages/inbox/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const grouped = {};
      data.forEach((msg) => {
        const lid = msg.listing;
        if (!grouped[lid]) grouped[lid] = { title: msg.listing_title, messages: [] };
        grouped[lid].messages.push({ ...msg, isOwn: msg.sender === currentEmail });
      });
      setConversations(grouped);
      if (selectedListingId && !grouped[selectedListingId]) setSelectedListingId(null);
    } catch {
      toast.error("Could not load inbox");
    }
  }

  async function handleSelectThread(lid) {
    setSelectedListingId(lid);
    setReplyText("");
    const unreadIds = conversations[lid].messages
      .filter(m => !m.isOwn && !m.read)
      .map(m => m.id);
    if (unreadIds.length) {
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch("/api/messages/mark-read/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: unreadIds }),
        });
        fetchMessages();
      } catch {
        toast.error("Failed to mark as read");
      }
    }
  }

  async function handleDeleteThread(lid) {
    if (!window.confirm("Delete this entire conversation?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/messages/conversation/${lid}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      // only treat 400+ as failure; 2xx/3xx (including 204) are OK
      if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
      setConversations(prev => {
        const copy = { ...prev };
        delete copy[lid];
        return copy;
      });
      if (selectedListingId === lid) setSelectedListingId(null);
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleReply() {
    if (!replyText.trim()) return;
    const msgs = conversations[selectedListingId].messages;
    const last = msgs[msgs.length - 1];
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/messages/${last.id}/reply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: replyText }),
      });
      if (!res.ok) throw new Error();
      setReplyText("");
      isTyping.current = false;
      fetchMessages();
    } catch {
      toast.error("Failed to send reply");
    }
  }

  const threads = Object.entries(conversations);

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>Conversations</h2>
        {threads.map(([lid, { title, messages }]) => {
          const last = messages[messages.length - 1];
          const unreadCount = messages.filter(m => !m.isOwn && !m.read).length;
          const isActive = lid.toString() === selectedListingId;
          return (
            <div
              key={lid}
              style={{
                ...styles.thread,
                ...(isActive ? styles.threadActive : {}),
              }}
            >
              <div style={styles.threadContent}>
                <div
                  onClick={() => handleSelectThread(lid)}
                  style={styles.threadInner}
                >
                  <div style={styles.avatar}>
                    {(last.isOwn ? currentEmail : last.sender)[0].toUpperCase()}
                  </div>
                  <div style={styles.metadata}>
                    <div style={styles.threadTitle}>
                      {title}
                      {unreadCount > 0 && (
                        <span style={styles.unreadBadge}>{unreadCount}</span>
                      )}
                    </div>
                    <div style={styles.threadPreview}>
                      {last.isOwn ? "You: " : ""}
                      {last.content.length > 30
                        ? `${last.content.slice(0, 30)}…`
                        : last.content}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteThread(lid)}
                  style={styles.deleteBtnInline}
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          );
        })}
      </aside>

      <main style={styles.chat}>
        <header style={styles.chatHeader}>
          {selectedListingId
            ? conversations[selectedListingId].title
            : "Select a conversation"}
        </header>

        <section style={styles.messages}>
          {selectedListingId &&
            conversations[selectedListingId].messages
              .slice()
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    ...(msg.isOwn ? styles.messageSent : styles.messageReceived),
                    opacity: msg.read || msg.isOwn ? 1 : 0.8,
                  }}
                >
                  <div style={styles.messageHeader}>
                    <strong>{msg.isOwn ? "You" : msg.sender}</strong>
                  </div>
                  <div style={styles.messageBody}>{msg.content}</div>
                  <div style={styles.messageTime}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
          <div ref={messagesEndRef} />
        </section>

        {selectedListingId && (
          <footer style={styles.replyBox}>
            <textarea
              style={styles.textarea}
              value={replyText}
              placeholder="Type your reply..."
              onChange={(e) => {
                isTyping.current = true;
                setReplyText(e.target.value);
              }}
            />
            <button style={styles.sendBtn} onClick={handleReply}>
              Send
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 300,
    borderRight: "1px solid #ddd",
    padding: "1rem",
    overflowY: "auto",
    background: "#fafafa",
  },
  sidebarTitle: {
    margin: "0 0 1rem",
    fontSize: "1.25rem",
    color: "#007bff",
  },
  thread: {
    marginBottom: "0.5rem",
    borderRadius: 6,
    overflow: "hidden",
  },
  threadActive: {
    background: "#e0f0ff",
  },
  threadContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadInner: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    padding: "0.5rem",
    cursor: "pointer",
  },
  avatar: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#007bff",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    marginRight: 12,
  },
  metadata: {
    flex: 1,
    overflow: "hidden",
  },
  threadTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  unreadBadge: {
    marginLeft: 6,
    background: "#dc3545",
    color: "#fff",
    borderRadius: 12,
    padding: "0 6px",
    fontSize: "0.7rem",
    fontWeight: "bold",
  },
  threadPreview: {
    fontSize: "0.85rem",
    color: "#555",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  threadDate: {
    flexShrink: 0,
    marginLeft: 8,
    fontSize: "0.75rem",
    color: "#888",
  },
  deleteBtnInline: {
    background: "transparent",
    border: "none",
    color: "#888",
    cursor: "pointer",
    padding: 4,
    fontSize: "0.9rem",
    opacity: 0.7,
    marginRight: 8,
  },

  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  chatHeader: {
    padding: "1rem",
    borderBottom: "1px solid #ddd",
    fontSize: "1.1rem",
    fontWeight: 600,
    background: "#fff",
  },
  messages: {
    flex: 1,
    padding: "1rem",
    overflowY: "auto",
    background: "#fefefe",
  },
  message: {
    maxWidth: "60%",
    marginBottom: "0.75rem",
    padding: "0.6rem 0.8rem",
    borderRadius: 12,
    lineHeight: 1.4,
  },
  messageSent: {
    marginLeft: "auto",
    background: "#007bff",
    color: "#fff",
  },
  messageReceived: {
    marginRight: "auto",
    background: "#eaeaea",
    color: "#000",
  },
  messageHeader: {
    marginBottom: 4,
    fontSize: "0.75rem",
    opacity: 0.8,
  },
  messageBody: {
    fontSize: "0.9rem",
  },
  messageTime: {
    marginTop: 4,
    fontSize: "0.7rem",
    textAlign: "right",
    opacity: 0.7,
  },
  replyBox: {
    padding: "0.5rem",
    borderTop: "1px solid #ddd",
    display: "flex",
    gap: 8,
    background: "#fff",
  },
  textarea: {
    flex: 1,
    padding: "8px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "0.9rem",
    resize: "none",
  },
  sendBtn: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "0 1rem",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};
