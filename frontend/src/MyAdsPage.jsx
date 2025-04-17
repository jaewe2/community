// src/MyAdsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEdit, FaTrash, FaDollarSign, FaMapMarkerAlt } from "react-icons/fa";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function MyAdsPage() {
  const [ads, setAds] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyAds = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("http://127.0.0.1:8000/api/postings/?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAds(data);
      } catch {
        toast.error("Couldn't load your ads");
      }
    };
    fetchMyAds();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this ad permanently?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setAds((prev) => prev.filter((ad) => ad.id !== id));
      toast.success("Ad deleted");
    } catch {
      toast.error("Failed to delete ad");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>My Ads</h1>
      {ads.length === 0 ? (
        <p style={styles.empty}>You haven’t posted any ads yet.</p>
      ) : (
        <div style={styles.grid}>
          {ads.map((ad) => {
            const imgUrl = ad.images?.[0]?.url || ad.images?.[0]?.image || "";
            return (
              <div key={ad.id} style={styles.card}>
                <div style={styles.imgWrapper}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={ad.title} style={styles.img} />
                  ) : (
                    <div style={styles.noImg}>No Image</div>
                  )}
                </div>
                <div style={styles.content}>
                  <h3 style={styles.title}>{ad.title}</h3>
                  <p style={styles.price}>
                    <FaDollarSign /> {ad.price ?? "—"}
                  </p>
                  <p style={styles.location}>
                    <FaMapMarkerAlt /> {ad.location}
                  </p>
                </div>
                <div style={styles.actions}>
                  <Link to={`/edit-listing/${ad.id}`} style={styles.editBtn}>
                    <FaEdit /> Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(ad.id)}
                    style={styles.deleteBtn}
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: "2rem",
    marginBottom: "1.5rem",
    color: "#222",
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: "#666",
    fontSize: "1rem",
    marginTop: "3rem",
  },
  grid: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  imgWrapper: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9 aspect
    background: "#f0f0f0",
  },
  img: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  noImg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
  },
  content: {
    padding: "1rem",
    flexGrow: 1,
  },
  title: {
    fontSize: "1.2rem",
    margin: "0 0 0.5rem",
    color: "#333",
  },
  price: {
    fontSize: "1rem",
    color: "#28a745",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  },
  location: {
    fontSize: "0.9rem",
    color: "#555",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0.75rem 1rem",
    borderTop: "1px solid #eee",
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#ffc107",
    color: "#000",
    padding: "6px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "0.9rem",
  },
  deleteBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#dc3545",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
};
