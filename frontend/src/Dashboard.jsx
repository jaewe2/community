// src/LandingPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const LandingPage = () => {
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  
  const navigate = useNavigate(); // useNavigate hook to navigate programmatically

  // Fetch categories and listings from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoryResponse = await axios.get("http://127.0.0.1:8000/api/categories/");
        setCategories(categoryResponse.data);

        // Fetch listings
        const listingsResponse = await axios.get("http://127.0.0.1:8000/api/postings/");
        setListings(listingsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search query change with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Wait for 500ms after the user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle search functionality
  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/postings/", {
        params: {
          search: debouncedSearch,
          category: selectedCategory,
          location: selectedLocation,
        },
      });
      setListings(response.data); // Update listings with search results
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search suggestions (e.g., categories)
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

  // Navigate to Listing Detail page when a listing is clicked
  const handleListingClick = (listingId) => {
    navigate(`/listing-detail/${listingId}`); // Navigate to the Listing Detail page
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Buy, Sell, Rent & Exchange in One Click</h1>
        <p style={styles.subTitle}>Find everything from used cars to mobile phones and more.</p>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="What are you looking for?"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value); // Capture search query
              handleSearchSuggestions(e.target.value); // Update search suggestions
            }}
            style={styles.searchInput}
          />
          {searchSuggestions.length > 0 && (
            <div style={styles.suggestionsContainer}>
              {searchSuggestions.map((suggestion, index) => (
                <div key={index} style={styles.suggestionItem}>
                  {suggestion.name}
                </div>
              ))}
            </div>
          )}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)} // Capture selected category
            style={styles.selectInput}
          >
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)} // Capture selected location
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchButton}>
            Search Now
          </button>
        </div>
      </header>

      <section style={styles.categoriesContainer}>
        <h2 style={styles.sectionTitle}>Popular Categories</h2>
        <div style={styles.categories}>
          {categories.map((category, index) => (
            <div
              key={index}
              style={styles.categoryCard}
              onClick={() => handleListingClick(category.id)} // Redirect to listings page with selected category
            >
              <span style={styles.categoryIcon}>📦</span>
              <h3 style={styles.categoryName}>{category.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.listingsContainer}>
        <h2 style={styles.sectionTitle}>Listings Near You</h2>
        <div style={styles.listings}>
          {listings.map((listing, index) => (
            <div
              key={index}
              style={styles.listingCard}
              onClick={() => handleListingClick(listing.id)} // Redirect to Listing Detail page
            >
              <h3 style={styles.listingTitle}>{listing.title}</h3>
              <p style={styles.listingDescription}>{listing.description}</p>
              <p style={styles.listingPrice}>${listing.price}</p>
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
    backgroundColor: "#5A2D76", // Maroon color
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
    cursor: "pointer",  // Makes it clickable
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
    cursor: "pointer",  // Makes it look clickable
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
