import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// 🔧 Pages & Components
import Login from "./Auth/Login";
import Register from "./Auth/Register";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";       // ← added
import PostAdPage from "./pages/PostAdPage";
import MyAdsPage from "./pages/MyAdsPage";
import MyMessages from "./MyMessages";
import Inbox from "./pages/Inbox";
import SettingsPage from "./pages/SettingsPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmation from "./OrderConfirmation";
import StripeSuccessPage from "./StripeSuccessPage";
import PrivateRoute from "./PrivateRoute";
import Navbar from "./Navbar";

// 🗂 Listings
import ListingsPage from "./Listings/ListingsPage";
import ListingDetail from "./Listings/ListingDetail";
import EditListing from "./Listings/EditListing";
import Favorites from "./Listings/Favorites";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// 🔑 Replace with your real Stripe publishable key
const stripePromise = loadStripe("pk_test_YourPublishableKeyHere");

export default function App() {
  return (
    <Elements stripe={stripePromise}>
      <Router>
        <Navbar />
        <ToastContainer position="top-right" autoClose={3000} />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listing-detail/:id" element={<ListingDetail />} />
          <Route path="/order-confirmation/success" element={<StripeSuccessPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"                     /* ← new Analytics route */
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route path="/post" element={<PrivateRoute><PostAdPage /></PrivateRoute>} />
          <Route path="/my-ads" element={<PrivateRoute><MyAdsPage /></PrivateRoute>} />
          <Route path="/favorites" element={<PrivateRoute><Favorites /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><MyMessages /></PrivateRoute>} />
          <Route path="/inbox" element={<PrivateRoute><Inbox /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/edit-listing/:id" element={<PrivateRoute><EditListing /></PrivateRoute>} />
          <Route path="/checkout/:id" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
          <Route path="/order-confirmation/:id" element={<PrivateRoute><OrderConfirmation /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<ListingsPage />} />
        </Routes>
      </Router>
    </Elements>
  );
}
