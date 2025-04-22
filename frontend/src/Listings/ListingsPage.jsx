import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FaHeart, FaTrash } from "react-icons/fa";

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [categories, setCategories] = useState([]);
  const [likedMap, setLikedMap] = useState({});
  const [user, setUser] = useState(null); // Current logged-in user

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const searchQuery = queryParams.get("search")?.toLowerCase() || "";
  const selectedCategory = queryParams.get("cat") || "";
  const selectedSort = queryParams.get("sort") || "";

  useEffect(() => {
    // Fetch current user info
    fetch("http://127.0.0.1:8000/api/user/profile", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    })
      .then((res) => res.json())
      .then(setUser)
      .catch(() => toast.error("Failed to load user"));

    // Fetch listings
    fetch("http://127.0.0.1:8000/api/postings/")
      .then((res) => res.json())
      .then(setListings)
      .catch(() => toast.error("Failed to load listings"));

    // Fetch categories
    fetch("http://127.0.0.1:8000/api/categories/")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories"));
  }, []);

  useEffect(() => {
    let results = [...listings];

    if (searchQuery) {
      results = results.filter((item) => {
        const content = [
          item.title,
          item.description,
          item.location,
          item.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return content.includes(searchQuery);
      });
    }

    // Using category_name for filtering
    if (selectedCategory) {
      results = results.filter((item) => {
        const categoryName = item.category_name || "";
        return categoryName.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    if (selectedSort === "price_asc") {
      results.sort((a, b) => a.price - b.price);
    } else if (selectedSort === "price_desc") {
      results.sort((a, b) => b.price - a.price);
    } else if (selectedSort === "newest") {
      results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    setFiltered(results);
  }, [listings, searchQuery, selectedCategory, selectedSort]);

  const handleCategoryChange = (e) => {
    const params = new URLSearchParams(location.search);
    const value = e.target.value;
    value ? params.set("cat", value) : params.delete("cat");
    navigate(`/listings?${params.toString()}`);
  };

  const handleSortChange = (e) => {
    const params = new URLSearchParams(location.search);
    const value = e.target.value;
    value ? params.set("sort", value) : params.delete("sort");
    navigate(`/listings?${params.toString()}`);
  };

  const resetFilters = () => {
    navigate("/listings");
  };

  const toggleLike = (id, e) => {
    e.preventDefault(); // prevent navigating to detail on heart click
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (listingId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this listing?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://127.0.0.1:8000/api/postings/${listingId}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Delete failed");
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
      toast.success("Listing deleted");
    } catch (err) {
      console.error(err);
      toast.error("Error deleting listing");
    }
  };

  return (
    <div style={styles.container}>
      <h2>Community Listings</h2>

      <div style={styles.filterRow}>
        <select value={selectedCategory} onChange={handleCategoryChange} style={styles.select}>
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <select value={selectedSort} onChange={handleSortChange} style={styles.select}>
          <option value="">Sort By</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
        </select>

        <button onClick={resetFilters} style={styles.reset}>
          Reset Filters
        </button>
      </div>

      {filtered.length === 0 ? (
        <p>No listings found.</p>
      ) : (
        <div style={styles.grid}>
          {filtered.map((item) => {
            const imageUrl =
              item.images?.[0]?.url ||
              item.images?.[0]?.image ||
              "https://via.placeholder.com/320x200?text=No+Image";

            return (
              <div key={item.id} style={styles.cardWrapper}>
                {/* Updated Link to match ListingDetail route */}
                <Link to={`/listing-detail/${item.id}`} style={styles.link}>
                  <div
                    style={styles.card}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.05)";
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Listing"
                      style={styles.image}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/320x200?text=No+Image";
                      }}
                    />
                    <h3 style={styles.title}>{item.title}</h3>
                    <p style={styles.price}>${item.price}</p>
                    <p style={styles.meta}>
                      <strong>Location:</strong> {item.location}
                    </p>
                    <p style={styles.meta}>
                      <strong>Category:</strong> {item.category_name || item.category}
                    </p>
                    <p style={styles.description}>{item.description}</p>
                    <p style={styles.date}>
                      Posted on {new Date(item.created_at).toLocaleDateString()}
                    </p>
                    <FaHeart
                      onClick={(e) => toggleLike(item.id, e)}
                      color={likedMap[item.id] ? "#dc3545" : "#ccc"}
                      size={20}
                      style={styles.heart}
                      title={likedMap[item.id] ? "Unfavorite" : "Favorite"}
                    />
                  </div>
                </Link>
                {user?.id === item.user && (
                  <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <FaTrash /> Delete Listing
                  </button>
                )}
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
    padding: "2rem 1rem",
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#222",
  },
  filterRow: {
    marginBottom: "2rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center",
    justifyContent: "space-between",
  },
  select: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    minWidth: "180px",
    backgroundColor: "#fff",
  },
  reset: {
    padding: "10px 14px",
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "background 0.3s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.75rem",
  },
  cardWrapper: {
    position: "relative",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  card: {
    padding: "1.5rem",
    borderRadius: "12px",
    background: "#fff",
    boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
    border: "1px solid #eee",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "200px",
    objectFit: "cover",
    borderRadius: "8px",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#007bff",
    marginBottom: "0.3rem",
  },
  price: {
    fontSize: "1rem",
    fontWeight: "500",
    color: "#28a745",
    marginBottom: "0.4rem",
  },
  meta: {
    fontSize: "0.9rem",
    color: "#555",
    marginBottom: "0.4rem",
  },
  description: {
    fontSize: "0.95rem",
    color: "#333",
    marginTop: "0.5rem",
  },
  date: {
    marginTop: "0.75rem",
    fontSize: "0.8rem",
    color: "#999",
  },
  heart: {
    position: "absolute",
    top: "14px",
    right: "16px",
    cursor: "pointer",
    zIndex: 2,
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  deleteBtn: {
    padding: "8px 12px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
  },
};
