// src/LandingPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import "./Dashboard.css";


const LandingPage = () => {
  const [categories, setCategories] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Store category name in state for the dropdown
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  // New state to store geolocation coordinates
  const [geoCoordinates, setGeoCoordinates] = useState({ lat: null, lng: null });

  const navigate = useNavigate(); // useNavigate hook to navigate programmatically

  // Fetch categories and listings from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoryResponse = await axios.get("http://127.0.0.1:8000/api/categories/");
        setCategories(categoryResponse.data);

        // Fetch listings (if you want to display them on the landing page)
        const listingsResponse = await axios.get("http://127.0.0.1:8000/api/postings/");
        setListings(listingsResponse.data);
        setAllListings(listingsResponse.data); // Store the full listings data separately
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search query change with debouncing (still used for suggestions)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Wait for 500ms after the user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get the user's current geolocation when the component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error obtaining geolocation:", error);
          // Optionally, you can prompt the user for manual input if geolocation fails.
        }
      );
    }
  }, []);

  // Handle search suggestions (e.g., matching category names)
  const handleSearchSuggestions = (query) => {
    if (query.length > 2) {
      // Only show suggestions if query length is more than 2 characters
      const filteredSuggestions = categories.filter((category) =>
        category.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchSuggestions(filteredSuggestions);
    } else {
      setSearchSuggestions([]);
    }
  };

  // Redirect to the Listings page with search parameters (including geolocation) in the URL.
  const handleSearch = () => {
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.set("search", searchQuery);
    if (selectedCategory) queryParams.set("cat", selectedCategory);
    if (selectedLocation) queryParams.set("location", selectedLocation);
    // Add geolocation parameters if available
    if (geoCoordinates.lat && geoCoordinates.lng) {
      queryParams.set("lat", geoCoordinates.lat);
      queryParams.set("lng", geoCoordinates.lng);
    }
    navigate(`/listings?${queryParams.toString()}`);
  };

  // Navigate to Listing Detail page when a listing is clicked.
  const handleListingClick = (listingId) => {
    navigate(`/listing-detail/${listingId}`); // Navigate to the Listing Detail page.
  };

  // Navigate to Listings page with a selected category filter (by category name).
  const handleCategoryClick = (categoryName) => {
    navigate(`/listings?cat=${encodeURIComponent(categoryName)}`);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div class="dashboard container" style={styles.container}>
      <header class="header" style={styles.header}>
        <h1 class="title" style={styles.title}>Buy, Sell, Rent & Exchange in One Click</h1>
        <p class="subTitle" style={styles.subTitle}>Find everything from used cars to mobile phones and more.</p>
        <div class="searchContainer" style={styles.searchContainer}>
          <input
            type="text"
            placeholder="What are you looking for?"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearchSuggestions(e.target.value);
            }}
            class="searchInput" style={styles.searchInput}
          />
          {searchSuggestions.length > 0 && (
            <div class="suggestionsContainer" style={styles.suggestionsContainer}>
              {searchSuggestions.map((suggestion, index) => (
                <div key={index} class="suggestionItem" style={styles.suggestionItem}>
                  {suggestion.name}
                </div>
              ))}
            </div>
          )}
          {/* Updated dropdown uses category name as value */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            class="selectInput" style={styles.selectInput}
          >
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            class="searchInput" style={styles.searchInput}
          />
          <button onClick={handleSearch} class="searchButton" style={styles.searchButton}>
            Search Now
          </button>
        </div>
      </header>

      <section class="categoriesContainer" style={styles.categoriesContainer}>
        <h2 class="sectionTitle" style={styles.sectionTitle}>Popular Categories</h2>
        <div class="categories" style={styles.categories}>
          {categories.map((category, index) => (
            <div
              key={index}
              class="categoryCard" style={styles.categoryCard}
              onClick={() => handleCategoryClick(category.name)}
            >
              <span class="categoryIcon" style={styles.categoryIcon}>📦</span>
              <h3 class="categoryName" style={styles.categoryName}>{category.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Optional: Display listings on the landing page */}
      <section class="listingsContainer" style={styles.listingsContainer}>
        <h2 class="sectionTitle" style={styles.sectionTitle}>Listings Near You</h2>
        <div class="listings" style={styles.listings}>
          {listings.map((listing, index) => (
            <div
              key={index}
              class="listingCard" style={styles.listingCard}
              onClick={() => handleListingClick(listing.id)}
            >
              <h3 class="listingTitle" style={styles.listingTitle}>{listing.title}</h3>
              <p class="listingDescription" style={styles.listingDescription}>{listing.description}</p>
              <p class="listingPrice" style={styles.listingPrice}>${listing.price}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: "2rem",
    textAlign: "center",
    backgroundColor: "#f4f4f4",
  },
  header: {
    backgroundColor: "#5A2D76",
    padding: "3rem 1.5rem",
    color: "#fff",
    borderRadius: "8px",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  },
  subTitle: {
    fontSize: "1.2rem",
    marginBottom: "2rem",
  },
  searchContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    position: "relative",
  },
  searchInput: {
    padding: "0.5rem",
    borderRadius: "4px",
    border: "none",
    width: "200px",
  },
  suggestionsContainer: {
    position: "absolute",
    backgroundColor: "#fff",
    width: "200px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    zIndex: "10",
    marginTop: "5px",
    maxHeight: "150px",
    overflowY: "auto",
  },
  suggestionItem: {
    padding: "0.5rem",
    cursor: "pointer",
    textAlign: "left",
  },
  selectInput: {
    padding: "0.5rem",
    borderRadius: "4px",
    border: "none",
  },
  searchButton: {
    padding: "0.5rem 1.5rem",
    backgroundColor: "#f7c800",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    color: "#fff",
  },
  categoriesContainer: {
    marginTop: "3rem",
  },
  sectionTitle: {
    fontSize: "1.8rem",
    marginBottom: "2rem",
  },
  categories: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "1rem",
  },
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
  },
  categoryIcon: {
    fontSize: "2rem",
    marginBottom: "1rem",
  },
  categoryName: {
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  listingsContainer: {
    marginTop: "3rem",
  },
  listings: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "1rem",
  },
  listingCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "1.5rem",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
  },
  listingTitle: {
    fontSize: "1.4rem",
    fontWeight: "bold",
  },
  listingDescription: {
    fontSize: "1rem",
    color: "#555",
    marginTop: "1rem",
  },
  listingPrice: {
    fontSize: "1.2rem",
    color: "#e91e63",
    marginTop: "1rem",
  },
};

export default LandingPage;
