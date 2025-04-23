import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaDollarSign,
  FaArrowLeft,
  FaHeart,
  FaTag,
  FaTrash,
} from "react-icons/fa";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import "./ListingsDetail.css";


export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [liked, setLiked] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [messageContent, setMessageContent] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);

  const localIcons = {
    "apple pay": "/ApplePay.jpg",
    paypal: "/Paypal.png",
    venmo: "/Venmo.png",
    "pay with cash": "/Cash.jpg",
    credit: "/CreditCard.jpg",
    debit: "/CreditCard.jpg",
    "credit/debit": "/CreditCard.jpg",
    cash: "/Cash.jpg",
  };

  useEffect(() => {
    if (!auth.currentUser) {
      toast.error("You must be logged in to view or interact with listings.");
      navigate("/login");
      return;
    }

    fetch(`http://127.0.0.1:8000/api/postings/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Listing not found");
        return res.json();
      })
      .then((data) => {
        setListing(data);
        if (data.images?.length > 0) {
          const firstImg = data.images[0].url || data.images[0].image;
          setMainImage(firstImg);
        }
      })
      .catch(() => navigate("/listings"));
  }, [id, navigate]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = await auth.currentUser.getIdToken();

        const profileRes = await fetch("http://127.0.0.1:8000/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        setUserEmail(profileData.email);
        setCurrentUserId(profileData.id);

        const favRes = await fetch("http://127.0.0.1:8000/api/favorites/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const favData = await favRes.json();
        const match = favData.find((fav) => fav.listing === Number(id));
        if (match) {
          setLiked(true);
          setFavoriteId(match.id);
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      }
    };

    if (auth.currentUser) fetchUserInfo();
  }, [id]);

  const toggleLike = async () => {
    const token = await auth.currentUser.getIdToken();
    if (!token) return;

    try {
      if (liked && favoriteId) {
        await fetch(`http://127.0.0.1:8000/api/favorites/${favoriteId}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiked(false);
        setFavoriteId(null);
      } else {
        const res = await fetch("http://127.0.0.1:8000/api/favorites/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ listing: id }),
        });
        const data = await res.json();
        setLiked(true);
        setFavoriteId(data.id);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Listing deleted");
      navigate("/listings");
    } catch (err) {
      toast.error("Error deleting listing");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (currentUserId === listing.user_id) {
      return toast.error("You cannot message your own listing.");
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/api/messages/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing: id,
          content: messageContent,
          recipient: listing.user_id,
        }),
      });
      if (!res.ok) throw new Error("Message failed");
      toast.success("Message sent!");
      setMessageContent("");
    } catch (err) {
      toast.error("Message failed to send");
    }
  };

  if (!listing) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div class="details container" style={styles.container}>
      <button onClick={() => navigate(-1)} class="back" style={styles.back}>
        <FaArrowLeft style={{ marginRight: "6px" }} /> Back
      </button>

      {mainImage && (
        <div class="mainImageWrapper" style={styles.mainImageWrapper}>
          <img src={mainImage} alt="Main" class="mainImage" style={styles.mainImage} />
        </div>
      )}

      <div class="headerRow" style={styles.headerRow}>
        <h2 class="title}>{listing.title" style={styles.title}>{listing.title}</h2>
        <FaHeart
          onClick={toggleLike}
          color={liked ? "#dc3545" : "#ccc"}
          size={22}
          style={{ cursor: "pointer" }}
        />
      </div>

      {currentUserId !== listing.user_id && listing.price > 0 && (
        <button
          onClick={() => navigate(`/checkout/${listing.id}`)}
          class="buyBtn" style={styles.buyBtn}
        >
          Buy Now (${listing.price})
        </button>
      )}

      {currentUserId === listing.user_id && (
        <div class="actionRow" style={styles.actionRow}>
          <Link to={`/edit-listing/${listing.id}`} class="editBtn" style={styles.editBtn}>
            ✏️ Edit Listing
          </Link>
          <button onClick={handleDelete} class="deleteBtn" style={styles.deleteBtn}>
            <FaTrash style={{ marginRight: "5px" }} /> Delete Listing
          </button>
        </div>
      )}

      <div class="detailBlock" style={styles.detailBlock}>
        <p class="price" style={styles.price}>
          <FaDollarSign /> ${listing.price}
        </p>
        <p><FaMapMarkerAlt /> {listing.location}</p>
        <p><FaTag /> {listing.category_name || listing.category}</p>
      </div>

      <p class="description}>{listing.description" style={styles.description}>{listing.description}</p>
      <p class="date" style={styles.date}>
        Posted on {new Date(listing.created_at).toLocaleDateString()}
      </p>

      {listing.payment_methods?.length > 0 && (
        <div class="paymentSection" style={styles.paymentSection}>
          <h4>Accepted Payments:</h4>
          <div class="paymentRow" style={styles.paymentRow}>
            {listing.payment_methods.map((pm) => {
              const key = pm.name.trim().toLowerCase();
              const iconSrc = localIcons[key] || pm.icon;
              return (
                <div key={pm.id} class="paymentItem" style={styles.paymentItem}>
                  <img
                    src={iconSrc}
                    alt={pm.name}
                    title={pm.name}
                    class="paymentIcon" style={styles.paymentIcon}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentUserId === listing.user_id ? (
        <div class="ownerBanner" style={styles.ownerBanner}>
          <p>You are the owner of this listing. Messaging is disabled.</p>
        </div>
      ) : (
        <div class="messageBox" style={styles.messageBox}>
          <h4>Contact Seller</h4>
          <form onSubmit={handleSendMessage} class="messageForm" style={styles.messageForm}>
            <input
              type="email"
              value={userEmail}
              readOnly
              class="messageInput" style={styles.messageInput}
              placeholder="Your Email"
            />
            <textarea
              placeholder="Write your message..."
              rows="4"
              required
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              class="messageTextarea" style={styles.messageTextarea}
            />
            <button type="submit" class="messageButton" style={styles.messageButton}>
              Send Message
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "860px",
    margin: "2rem auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  back: {
    background: "none",
    border: "none",
    color: "#007bff",
    fontWeight: "bold",
    marginBottom: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "1rem",
  },
  mainImageWrapper: { marginBottom: "1rem" },
  mainImage: {
    width: "100%",
    maxHeight: "420px",
    objectFit: "cover",
    borderRadius: "10px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  title: { fontSize: "1.8rem", color: "#222", fontWeight: 600 },
  buyBtn: {
    background: "#28a745",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
    marginBottom: "1rem",
  },
  actionRow: { display: "flex", gap: "10px", marginBottom: "1.5rem" },
  editBtn: {
    background: "#ffc107",
    color: "#000",
    padding: "6px 14px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
  },
  deleteBtn: {
    background: "#dc3545",
    color: "#fff",
    padding: "6px 14px",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  detailBlock: {
    marginBottom: "1rem",
    fontSize: "1rem",
    color: "#444",
    lineHeight: 1.6,
  },
  price: { color: "#28a745", fontWeight: "bold", fontSize: "1.2rem" },
  description: { marginTop: "1rem", fontSize: "1rem", color: "#333" },
  date: { marginTop: "1rem", fontSize: "0.9rem", color: "#777" },
  paymentSection: { marginTop: "1.5rem" },
  paymentRow: { display: "flex", gap: "12px", alignItems: "center" },
  paymentItem: { display: "flex", alignItems: "center" },
  paymentIcon: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
    borderRadius: "6px",
    background: "#fff",
    border: "1px solid #ddd",
    padding: "4px",
  },
  ownerBanner: {
    marginTop: "2rem",
    padding: "1rem",
    backgroundColor: "#f8f9fa",
    border: "1px solid #ddd",
    borderRadius: "8px",
    color: "#555",
    textAlign: "center",
    fontStyle: "italic",
  },
  messageBox: {
    marginTop: "2.5rem",
    padding: "1rem",
    border: "1px solid #eee",
    borderRadius: "10px",
    background: "#fafafa",
  },
  messageForm: { display: "flex", flexDirection: "column", gap: "10px" },
  messageInput: { padding: "10px", borderRadius: "6px", border: "1px solid #ccc" },
  messageTextarea: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    resize: "vertical",
  },
  messageButton: {
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

