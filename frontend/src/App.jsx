// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import PostAdPage from "./PostAdPage";
import ListingsPage from "./ListingsPage";
import ListingDetail from "./ListingDetail";
import MyAdsPage from "./MyAdsPage";          // ← NEW
import Favorites from "./Favorites";
import MyMessages from "./MyMessages";
import Inbox from "./Inbox";
import SettingsPage from "./SettingsPage";
import EditListing from "./EditListing";
import PrivateRoute from "./PrivateRoute";
import Navbar from "./Navbar";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <Router>
      <Navbar />
      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          path="/post"
          element={
            <PrivateRoute>
              <PostAdPage />
            </PrivateRoute>
          }
        />

        {/* ← “My Ads” */}
        <Route
          path="/my-ads"
          element={
            <PrivateRoute>
              <MyAdsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <Favorites />
            </PrivateRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <PrivateRoute>
              <MyMessages />
            </PrivateRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <PrivateRoute>
              <Inbox />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/edit-listing/:id"
          element={
            <PrivateRoute>
              <EditListing />
            </PrivateRoute>
          }
        />

        {/* Public listing views */}
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listing-detail/:id" element={<ListingDetail />} />

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}
