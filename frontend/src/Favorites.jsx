// src/Favorites.jsx
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [selectedFavorite, setSelectedFavorite] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const fetchFavorites = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/favorites/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFavorites(data);
    } catch (err) {
      toast.error("Failed to load favorites");
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const confirmUnfavorite = (fav) => {
    setSelectedFavorite(fav);
    setShowModal(true);
  };

  const handleRemove = async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token || !selectedFavorite) return;

    try {
      await fetch(
        `http://127.0.0.1:8000/api/favorites/${selectedFavorite.id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Removed from favorites");
      setFavorites((prev) =>
        prev.filter((fav) => fav.id !== selectedFavorite.id)
      );
      setShowModal(false);
    } catch (err) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Your Favorites</h2>
      {favorites.length === 0 ? (
        <p>You have no favorite listings yet.</p>
      ) : (
        <div style={styles.grid}>
          {favorites.map((fav) => {
            // Get the image from listing_images, no default placeholder
            const img = fav.listing_images?.[0]?.url || fav.listing_images?.[0]?.image;
            return (
              <div
                key={fav.id}
                style={styles.card}
                // Updated onClick to use the correct route for listing details
                onClick={() => navigate(`/listing-detail/${fav.listing}`)}
              >
                {img && <img src={img} alt="Listing" style={styles.image} />}
                <h4>{fav.listing_title}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmUnfavorite(fav);
                  }}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Remove Favorite</h3>
            <p>
              Are you sure you want to remove{" "}
              <strong>{selectedFavorite?.listing_title}</strong> from your favorites?
            </p>
            <div style={styles.modalActions}>
              <button onClick={handleRemove} style={styles.confirmBtn}>
                Yes, Remove
              </button>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "1000px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', sans-serif",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
    cursor: "pointer",
    position: "relative",
    transition: "transform 0.2s ease",
  },
  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "0.5rem",
  },
  removeBtn: {
    position: "absolute",
    bottom: "1rem",
    right: "1rem",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "2rem",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
    animation: "fadeIn 0.3s ease-out",
  },
  modalActions: {
    marginTop: "1.5rem",
    display: "flex",
    justifyContent: "space-around",
  },
  confirmBtn: {
    background: "#007bff",
    color: "#fff",
    padding: "10px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelBtn: {
    background: "#6c757d",
    color: "#fff",
    padding: "10px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
