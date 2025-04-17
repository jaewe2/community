import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    category: "",
  });
  const [images, setImages] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch listing");
        const data = await res.json();
        setForm({
          title: data.title,
          description: data.description,
          price: data.price,
          location: data.location,
          category: data.category,
        });
        if (data.images?.length > 0) {
          const imageFiles = data.images.map((img) => ({
            id: img.id,
            file: null,
            preview: img.url || img.image,
            isExisting: true,
          }));
          setImages(imageFiles);
        }
      } catch (err) {
        console.error("Listing fetch failed:", err);
        toast.error("Could not load listing data");
      }
    };

    fetchListing();

    fetch("http://127.0.0.1:8000/api/categories/")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => toast.error("Could not load categories"));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (files) => {
    const total = images.length + files.length;
    if (total > 5) {
      toast.error("You can only upload up to 5 images.");
      return;
    }

    const newImages = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const handleReplaceImage = (index) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const updated = [...images];
        const prev = updated[index];
        if (prev.isExisting) setDeletedImages((d) => [...d, Number(prev.id)]);
        updated[index] = {
          id: `replaced-${Date.now()}`,
          file,
          preview: URL.createObjectURL(file),
          isExisting: false,
        };
        setImages(updated);
      }
    };
    fileInput.click();
  };

  const handleDeleteImage = (index) => {
    const imgToDelete = images[index];
    if (imgToDelete.isExisting) {
      setDeletedImages((prev) => [...prev, Number(imgToDelete.id)]);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleImageChange(droppedFiles);
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

    try {
      setLoading(true);
      const token = await user.getIdToken();

      const formData = new FormData();
      for (let key in form) {
        formData.append(key, form[key]);
      }
      images.forEach((img) => {
        if (!img.isExisting && img.file) {
          formData.append("images", img.file);
        }
      });
      deletedImages.forEach((id) => formData.append("deleted_images", id));

      const response = await fetch(`http://127.0.0.1:8000/api/postings/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed: ${errorData.detail || "Unknown error"}`);
      } else {
        toast.success("Listing updated successfully!");
        navigate(`/listing-detail/${id}`);
      }
    } catch (err) {
      console.error("Error updating listing:", err);
      toast.error("Network error: Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Edit Listing</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} style={styles.input} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} style={styles.textarea} required />
        <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleChange} style={styles.input} />
        <input name="location" placeholder="Location" value={form.location} onChange={handleChange} style={styles.input} required />
        <select name="category" value={form.category} onChange={handleChange} style={styles.input} required>
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} style={{
          ...styles.dropzone,
          borderColor: isDragging ? "#007bff" : "#ccc",
          backgroundColor: isDragging ? "#f0f8ff" : "#fafafa",
        }}>
          <p>{images.length < 5 ? "Drag & drop images here or click to upload" : "Max 5 images uploaded"}</p>
          <input type="file" accept="image/*" multiple onChange={(e) => handleImageChange(Array.from(e.target.files))} disabled={images.length >= 5} style={{ display: "none" }} id="fileInput" />
          <label htmlFor="fileInput" style={styles.uploadLabel}>Browse</label>
        </div>

        {images.length > 0 && (
          <div style={styles.previewRow}>
            {images.map((img, idx) => (
              <div key={img.id} style={styles.thumbWrapper}>
                <img src={img.preview} alt="preview" onClick={() => handleReplaceImage(idx)} style={styles.thumb} title="Click to replace image" />
                <button type="button" onClick={() => handleDeleteImage(idx)} style={styles.deleteBtn} title="Remove image">✕</button>
              </div>
            ))}
          </div>
        )}

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Updating..." : "Save Changes"}
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
  thumbWrapper: {
    position: "relative",
    display: "inline-block",
  },
  thumb: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "2px solid #ddd",
    cursor: "pointer",
    transition: "border 0.2s ease",
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
    fontWeight: "bold",
    fontSize: "12px",
    lineHeight: "1",
  },
};
