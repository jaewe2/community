import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function PostAdPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    category: "",
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/categories/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then(setCategories)
      .catch(() => toast.error("Could not load categories"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const total = images.length + files.length;
    if (total > 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }
    setImages([...images, ...files.slice(0, 5 - images.length)]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const total = images.length + droppedFiles.length;
    if (total > 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }
    setImages([...images, ...droppedFiles.slice(0, 5 - images.length)]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return toast.error("You must be logged in");

    try {
      setLoading(true);
      const token = await user.getIdToken();

      const formData = new FormData();
      for (let key in form) {
        formData.append(key, form[key]);
      }
      images.forEach((img) => formData.append("images", img));

      const response = await fetch("http://127.0.0.1:8000/api/postings/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed: ${errorData.detail || "Unknown error"}`);
      } else {
        toast.success("Ad posted successfully!");
        setForm({
          title: "",
          description: "",
          price: "",
          location: "",
          category: "",
        });
        setImages([]);
      }
    } catch (err) {
      console.error("Error submitting post:", err);
      toast.error("Network error: Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="container" style={styles.container}>
      <h2>Post a New Ad</h2>
      <form onSubmit={handleSubmit} class="form" style={styles.form}>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          class="input" style={styles.input}
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          class="textarea" style={styles.textarea}
          required
        />
        <input
          name="price"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          class="input" style={styles.input}
        />
        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          class="input" style={styles.input}
          required
        />
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          class="input" style={styles.input}
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            ...styles.dropzone,
            borderColor: isDragging ? "#007bff" : "#ccc",
            backgroundColor: isDragging ? "#f0f8ff" : "#fafafa",
          }}
        >
          <p>
            {images.length < 5
              ? "Drag & drop images here or click to upload"
              : "Max 5 images uploaded"}
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={images.length >= 5}
            style={{ display: "none" }}
            id="fileInput"
          />
          <label htmlFor="fileInput" class="uploadLabel" style={styles.uploadLabel}>
            Browse
          </label>
        </div>

        {images.length > 0 && (
          <div class="previewRow" style={styles.previewRow}>
            {images.map((img, idx) => (
              <img
                key={idx}
                src={URL.createObjectURL(img)}
                alt="preview"
                class="thumb" style={styles.thumb}
              />
            ))}
          </div>
        )}

        <button type="submit" class="button" style={styles.button} disabled={loading}>
          {loading ? "Posting..." : "Submit Ad"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  textarea: {
    padding: "10px",
    fontSize: "1rem",
    height: "100px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    background: "#007bff",
    color: "#fff",
    padding: "10px",
    fontWeight: "bold",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  dropzone: {
    border: "2px dashed #ccc",
    padding: "1.5rem",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "1rem",
    position: "relative",
    textAlign: "center",
    transition: "all 0.3s",
  },
  uploadLabel: {
    display: "inline-block",
    marginTop: "0.5rem",
    background: "#007bff",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  previewRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "0.5rem",
  },
  thumb: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #ddd",
  },
};