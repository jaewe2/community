// CheckoutPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { toast } from "react-toastify";

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState("");
  const [loading, setLoading] = useState(false);

  // Personal Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Address Info
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  // Local fallback icons
  const localIcons = {
    "Apple Pay": "/ApplePay.jpg",
    "PayPal": "/Paypal.png",
    "Venmo": "/Venmo.png",
    "Pay with Cash": "/Cash.jpg",
    "Credit/Debit": "/CreditCard.jpg",
  };

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/postings/${id}/`)
      .then((res) => res.json())
      .then((data) => {
        setListing(data);
        auth.currentUser?.email && setEmail(auth.currentUser.email);
      })
      .catch(() => {
        toast.error("Could not load listing");
        navigate("/listings");
      });
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return toast.error("Select a payment method");

    if (!firstName || !lastName || !email || !phone || !street || !city || !state || !zip || !country) {
      return toast.error("Please complete all required fields");
    }

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`http://127.0.0.1:8000/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing: Number(id),
          payment_method: Number(selectedPayment),
          offerings: [],
          address_details: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            street,
            city,
            state,
            zip,
            country,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(
          errorData?.detail ||
            Object.entries(errorData)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join(", ") ||
            "Payment failed"
        );
        return;
      }

      const data = await res.json();
      toast.success("Order placed successfully! 🎉");
      navigate(`/order-confirmation/${data.id}`);
    } catch (err) {
      toast.error(err.message || "Payment error");
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Back</button>
      <h2>Checkout: {listing.title}</h2>
      <p style={styles.price}>Total: ${listing.price}</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Payment */}
        <fieldset style={styles.fieldset}>
          <legend>Select Payment Method</legend>
          {listing.payment_methods.map((pm) => {
            const cleanName = pm.name?.trim().toLowerCase();
            const matchedIcon =
              Object.entries(localIcons).find(
                ([key]) => key.trim().toLowerCase() === cleanName
              )?.[1] || pm.icon;

            return (
              <label
                key={pm.id}
                style={{
                  ...styles.label,
                  border: selectedPayment === String(pm.id)
                    ? "2px solid #007bff"
                    : "1px solid #ddd",
                  backgroundColor: selectedPayment === String(pm.id)
                    ? "#f0f8ff"
                    : "#fff",
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value={pm.id}
                  checked={selectedPayment === String(pm.id)}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                {matchedIcon && (
                  <img src={matchedIcon} alt={pm.name} style={styles.icon} />
                )}
                <span style={styles.labelText}>{pm.name}</span>
              </label>
            );
          })}
        </fieldset>

        {/* Personal Info */}
        <fieldset style={styles.fieldset}>
          <legend>Personal Info</legend>
          <input style={styles.input} placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input style={styles.input} placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.input} placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </fieldset>

        {/* Address Info */}
        <fieldset style={styles.fieldset}>
          <legend>Mailing Address</legend>
          <input style={styles.input} placeholder="Street Address" value={street} onChange={(e) => setStreet(e.target.value)} />
          <input style={styles.input} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input style={styles.input} placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
          <input style={styles.input} placeholder="ZIP Code" value={zip} onChange={(e) => setZip(e.target.value)} />
          <input style={styles.input} placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </fieldset>

        <button type="submit" style={styles.payBtn} disabled={loading}>
          {loading ? "Processing…" : `Pay $${listing.price}`}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "650px",
    margin: "2rem auto",
    padding: "1.5rem",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  back: {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  price: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginBottom: "1rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  fieldset: {
    border: "1px solid #ddd",
    padding: "1rem",
    borderRadius: "6px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "0.8rem",
    fontSize: "1rem",
    padding: "0.6rem",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  },
  labelText: {
    fontSize: "1rem",
    fontWeight: 500,
    color: "#333",
  },
  icon: {
    width: "40px",
    height: "40px",
    objectFit: "contain",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    borderRadius: "6px",
    padding: "6px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    width: "100%",
    marginBottom: "0.8rem",
    fontSize: "1rem",
  },
  payBtn: {
    background: "#28a745",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "1rem",
  },
};
