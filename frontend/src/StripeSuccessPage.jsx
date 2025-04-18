
// src/StripeSuccessPage.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function StripeSuccessPage() {
  const query = new URLSearchParams(useLocation().search);
  const sessionId = query.get("session_id");
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      console.log("✅ Payment success. Session ID:", sessionId);
      toast.success("Payment successful! 🎉");
    } else {
      toast.error("No session ID found.");
      navigate("/listings");
    }
  }, [sessionId, navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>🎉 Payment Completed!</h2>
      <p>Your order has been processed successfully.</p>
      <p>Session ID: <code>{sessionId}</code></p>
    </div>
  );
}
