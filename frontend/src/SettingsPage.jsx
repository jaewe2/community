
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("http://127.0.0.1:8000/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setProfile(data);
      setFormData(data);
    } catch (err) {
      toast.error("Could not load profile info");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setProfileImage(file);
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const form = new FormData();
      form.append("first_name", formData.first_name);
      form.append("last_name", formData.last_name);
      form.append("username", formData.username);
      if (profileImage) form.append("profile_image", profileImage);

      const res = await fetch("http://127.0.0.1:8000/api/user/profile/update", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) throw new Error("Update failed");
      toast.success("Profile updated successfully");
      setEditing(false);
      fetchUserProfile(); // Fetch the profile again to reflect changes
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  if (!profile) return <p style={{ padding: "2rem" }}>Loading profile...</p>;

  const profileImageUrl = profile.profile_picture
    ? `http://127.0.0.1:8000${profile.profile_picture}`
    : "/default-avatar.png";

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Account Settings</h2>
      <div style={styles.profileSection}>
        <div style={styles.imageWrapper}>
          <img
            src={previewUrl || profileImageUrl}
            alt="Profile"
            style={styles.avatar}
          />
          {editing && (
            <input type="file" accept="image/*" onChange={handleImageChange} />
          )}
        </div>

        <div style={styles.infoGroup}>
          <label>Email:</label>
          <p>{profile.email}</p>

          <label>Username:</label>
          {editing ? (
            <input
              name="username"
              value={formData.username || ""}
              onChange={handleChange}
              style={styles.input}
            />
          ) : (
            <p>{profile.username}</p>
          )}

          <label>First Name:</label>
          {editing ? (
            <input
              name="first_name"
              value={formData.first_name || ""}
              onChange={handleChange}
              style={styles.input}
            />
          ) : (
            <p>{profile.first_name}</p>
          )}

          <label>Last Name:</label>
          {editing ? (
            <input
              name="last_name"
              value={formData.last_name || ""}
              onChange={handleChange}
              style={styles.input}
            />
          ) : (
            <p>{profile.last_name}</p>
          )}
        </div>
      </div>

      <div style={styles.actions}>
        {editing ? (
          <>
            <button onClick={handleSave} style={styles.saveBtn}>Save</button>
            <button onClick={() => setEditing(false)} style={styles.cancelBtn}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} style={styles.editBtn}>Edit Profile</button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "700px",
    margin: "2rem auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  heading: {
    fontSize: "1.8rem",
    marginBottom: "1.5rem",
    color: "#007bff",
  },
  profileSection: {
    display: "flex",
    gap: "2rem",
  },
  imageWrapper: {
    minWidth: "120px",
  },
  avatar: {
    width: "120px",
    height: "120px",
    objectFit: "cover",
    borderRadius: "50%",
    marginBottom: "10px",
    border: "2px solid #ccc",
  },
  infoGroup: {
    flex: 1,
  },
  input: {
    display: "block",
    marginBottom: "12px",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "100%",
  },
  actions: {
    marginTop: "2rem",
    display: "flex",
    gap: "10px",
  },
  editBtn: {
    backgroundColor: "#007bff",
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  saveBtn: {
    backgroundColor: "#28a745",
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#6c757d",
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
