import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

export default function OrderConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`http://127.0.0.1:8000/api/orders/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch order");
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        toast.error("Could not load order");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Order Receipt", 20, 20);

    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 30);
    doc.text(`Listing: ${order.listing_title || order.listing}`, 20, 40);
    doc.text(`Payment Method: ${order.payment_method_name || order.payment_method}`, 20, 50);
    doc.text(`Total: $${order.total_price}`, 20, 60);
    doc.text(`Status: ${order.status}`, 20, 70);
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 20, 80);

    const addr = order.address_details;
    if (addr) {
      doc.text("Shipping Info:", 20, 95);
      doc.text(`${addr.first_name} ${addr.last_name}`, 20, 105);
      doc.text(`${addr.email} | ${addr.phone}`, 20, 115);
      doc.text(`${addr.street}`, 20, 125);
      doc.text(`${addr.city}, ${addr.state} ${addr.zip}`, 20, 135);
      doc.text(`${addr.country}`, 20, 145);
    }

    doc.save(`receipt_order_${order.id}.pdf`);
  };

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  const addr = order.address_details;

  return (
    <div style={styles.container}>
      <h2>Order Confirmed ✅</h2>
      <p><strong>Order ID:</strong> {order.id}</p>
      <p><strong>Listing:</strong> {order.listing_title || order.listing}</p>
      <p><strong>Payment Method:</strong> {order.payment_method_name || order.payment_method}</p>
      <p><strong>Offerings:</strong> {order.offerings.length > 0 ? order.offerings.join(", ") : "None"}</p>
      <p><strong>Total:</strong> ${order.total_price}</p>
      <p><strong>Status:</strong> {order.status}</p>
      <p><strong>Ordered At:</strong> {new Date(order.created_at).toLocaleString()}</p>

      {addr && (
        <div style={styles.section}>
          <h4>Shipping Address</h4>
          <p><strong>Name:</strong> {addr.first_name} {addr.last_name}</p>
          <p><strong>Email:</strong> {addr.email}</p>
          <p><strong>Phone:</strong> {addr.phone}</p>
          <p><strong>Street:</strong> {addr.street}</p>
          <p><strong>City/State/ZIP:</strong> {addr.city}, {addr.state} {addr.zip}</p>
          <p><strong>Country:</strong> {addr.country}</p>
        </div>
      )}

      <div style={styles.actions}>
        <button onClick={downloadReceipt} style={styles.button}>
          Download Receipt
        </button>
        <button onClick={() => navigate("/dashboard")} style={styles.linkBtn}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    padding: "2rem",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
    fontFamily: "'Segoe UI', sans-serif",
  },
  section: {
    marginTop: "1.5rem",
    lineHeight: "1.6",
  },
  actions: {
    marginTop: "2rem",
    display: "flex",
    gap: "1rem",
  },
  button: {
    background: "#007bff",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  linkBtn: {
    background: "#6c757d",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
