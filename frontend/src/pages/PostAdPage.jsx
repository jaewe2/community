// src/PostAdPage.jsx
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";

export default function PostAdPage() {
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [offerings, setOfferings] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    category: "",
    payment_methods_ids: [],
    offerings_ids: [],
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/categories/")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => toast.error("Could not load categories"));

    // ← corrected endpoint names:
    fetch("http://127.0.0.1:8000/api/payment-methods/")
      .then((res) => res.json())
      .then(setPaymentMethods)
      .catch(() => toast.error("Could not load payment options"));

    fetch("http://127.0.0.1:8000/api/offerings/")
      .then((res) => res.json())
      .then(setOfferings)
      .catch(() => toast.error("Could not load offerings"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleCheckbox = (field, id) => {
    setForm((f) => {
      const s = new Set(f[field]);
      s.has(id) ? s.delete(id) : s.add(id);
      return { ...f, [field]: Array.from(s) };
    });
  };

  const handleImageFiles = (files) => {
    const total = images.length + files.length;
    if (total > 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }
    setImages((prev) => [...prev, ...files.slice(0, 5 - prev.length)]);
  };

  const handleImageChange = (e) => {
    handleImageFiles(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageFiles(Array.from(e.dataTransfer.files));
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return toast.error("You must be logged in");

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();

      // basic fields
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) return; // skip arrays
        formData.append(k, v);
      });

      // images
      images.forEach((img) => formData.append("images", img));

      // m2m ids
      form.payment_methods_ids.forEach((id) =>
        formData.append("payment_methods_ids", id)
      );
      form.offerings_ids.forEach((id) =>
        formData.append("offerings_ids", id)
      );

      const res = await fetch("http://127.0.0.1:8000/api/postings/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Unknown error");
      }
      toast.success("Ad posted successfully!");
      setForm({
        title: "",
        description: "",
        price: "",
        location: "",
        category: "",
        payment_methods_ids: [],
        offerings_ids: [],
      });
      setImages([]);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Post a New Ad</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          style={styles.textarea}
          required
        />
        <input
          name="price"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          style={styles.input}
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <fieldset style={styles.fieldset}>
          <legend>Payment Methods</legend>
          {paymentMethods.map((pm) => (
            <label key={pm.id} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.payment_methods_ids.includes(pm.id)}
                onChange={() => toggleCheckbox("payment_methods_ids", pm.id)}
              />{" "}
              {pm.name}
            </label>
          ))}
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend>Offerings / Add‑ons</legend>
          {offerings.map((of) => (
            <label key={of.id} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.offerings_ids.includes(of.id)}
                onChange={() => toggleCheckbox("offerings_ids", of.id)}
              />{" "}
              {of.name} (+${of.extra_cost})
            </label>
          ))}
        </fieldset>

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
            id="fileInput"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            disabled={images.length >= 5}
            style={{ display: "none" }}
          />
          <label htmlFor="fileInput" style={styles.uploadLabel}>
            Browse
          </label>
        </div>

        {images.length > 0 && (
          <div style={styles.previewRow}>
            {images.map((img, i) => (
              <img
                key={i}
                src={URL.createObjectURL(img)}
                alt="preview"
                style={styles.thumb}
              />
            ))}
          </div>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Posting…" : "Submit Ad"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "600px",
    margin: "0 auto",
    textAlign: "center",
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
  fieldset: {
    border: "1px solid #ddd",
    padding: "10px",
    borderRadius: "5px",
    textAlign: "left",
  },
  checkboxLabel: {
    display: "block",
    fontSize: "0.9rem",
    margin: "4px 0",
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
  },
  thumb: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #ddd",
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
};
