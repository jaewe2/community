// src/EditListing.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [deletedImages, setDeletedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const [lstRes, catRes, pmRes, ofRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://127.0.0.1:8000/api/categories/"),
          fetch("http://127.0.0.1:8000/api/payment-methods/"), // ✅ FIXED
          fetch("http://127.0.0.1:8000/api/offerings/"),       // ✅ FIXED
        ]);

        if (!lstRes.ok) throw new Error("Failed to fetch listing");
        const data = await lstRes.json();

        setForm({
          title: data.title,
          description: data.description,
          price: data.price || "",
          location: data.location,
          category: data.category,
          payment_methods_ids: data.payment_methods.map((x) => x.id),
          offerings_ids: data.offerings.map((x) => x.id),
        });

        setImages(
          data.images.map((img) => ({
            id: img.id,
            file: null,
            preview: img.url || img.image,
            isExisting: true,
          }))
        );

        if (catRes.ok) setCategories(await catRes.json());
        if (pmRes.ok) setPaymentMethods(await pmRes.json());
        if (ofRes.ok) setOfferings(await ofRes.json());
      } catch (err) {
        console.error(err);
        toast.error("Could not load data");
      }
    };
    load();
  }, [id]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleCheckbox = (field, val) =>
    setForm((f) => {
      const s = new Set(f[field]);
      s.has(val) ? s.delete(val) : s.add(val);
      return { ...f, [field]: Array.from(s) };
    });

  const handleImageFiles = (files) => {
    const total = images.length + files.length;
    if (total > 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }
    const newbies = files.map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }));
    setImages((prev) => [...prev, ...newbies]);
  };

  const handleImageChange = (e) =>
    handleImageFiles(Array.from(e.target.files));

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

  const handleReplaceImage = (idx) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setImages((prev) => {
          const copy = [...prev];
          const old = copy[idx];
          if (old.isExisting) {
            setDeletedImages((d) => [...d, old.id]);
          }
          copy[idx] = {
            id: `new-${Date.now()}`,
            file,
            preview: URL.createObjectURL(file),
            isExisting: false,
          };
          return copy;
        });
      }
    };
    input.click();
  };

  const handleDeleteImage = (idx) => {
    const img = images[idx];
    if (img.isExisting) {
      setDeletedImages((d) => [...d, img.id]);
    }
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return toast.error("You must be logged in");

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const fd = new FormData();

      ["title", "description", "price", "location", "category"].forEach((k) =>
        fd.append(k, form[k])
      );

      images.forEach((img) => {
        if (!img.isExisting && img.file) {
          fd.append("images", img.file);
        }
      });

      deletedImages.forEach((id) => fd.append("deleted_images", id));

      form.payment_methods_ids.forEach((pm) =>
        fd.append("payment_methods_ids", pm)
      );
      form.offerings_ids.forEach((of) => fd.append("offerings_ids", of));

      const res = await fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Update failed");
      }

      toast.success("Listing updated!");
      navigate(`/listing-detail/${id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Edit Listing</h2>
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
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
              : "Max 5 images"}
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
            {images.map((img, idx) => (
              <div key={img.id} style={styles.thumbWrapper}>
                <img
                  src={img.preview}
                  alt="preview"
                  onClick={() => handleReplaceImage(idx)}
                  style={styles.thumb}
                  title="Click to replace"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteImage(idx)}
                  style={styles.deleteBtn}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
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
  thumbWrapper: {
    position: "relative",
    display: "inline-block",
  },
  thumb: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid #ddd",
    cursor: "pointer",
  },
  deleteBtn: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    fontSize: "12px",
    lineHeight: "1",
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
