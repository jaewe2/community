// src/pages/Analytics.jsx
import React, { useState, useEffect, useCallback } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ResponsiveContainer
} from "recharts";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [postsByMonth, setPostsByMonth] = useState([]);
  const [salesByMonth, setSalesByMonth] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // date‐range filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAnalytics = useCallback(
    async (start = "", end = "") => {
      setLoading(true);
      setError(false);

      try {
        const token = await auth.currentUser.getIdToken();
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // build query string
        const params = new URLSearchParams();
        if (start) params.set("start", start);
        if (end)   params.set("end", end);
        const qs = params.toString() ? `?${params.toString()}` : "";

        // fire off all 4 requests in parallel
        const [ovRes, pbmRes, sbmRes, sbcRes] = await Promise.all([
          fetch(`/api/analytics/user/overview/${qs}`,          { headers }),
          fetch(`/api/analytics/user/posts-by-month/${qs}`,    { headers }),
          fetch(`/api/analytics/user/sales-by-month/${qs}`,    { headers }),
          fetch(`/api/analytics/user/sales-by-category/${qs}`, { headers }),
        ]);

        if (!ovRes.ok)  throw new Error("Overview failed");
        if (!pbmRes.ok) throw new Error("Posts-by-month failed");
        if (!sbmRes.ok) throw new Error("Sales-by-month failed");
        if (!sbcRes.ok) throw new Error("Sales-by-category failed");

        const [ovData, pbmData, sbmData, sbcData] = await Promise.all([
          ovRes.json(),
          pbmRes.json(),
          sbmRes.json(),
          sbcRes.json(),
        ]);

        setOverview(ovData);
        setPostsByMonth(pbmData);
        setSalesByMonth(sbmData);
        setSalesByCategory(sbcData);
      } catch (err) {
        console.error(err);
        toast.error("Could not load analytics");
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // initial load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return <div style={styles.loading}>Loading analytics…</div>;
  }
  if (error) {
    return (
      <div style={styles.loading}>
        <p>Failed to load analytics.</p>
        <button onClick={() => fetchAnalytics(startDate, endDate)}>
          Retry
        </button>
      </div>
    );
  }
  if (!overview) {
    return <div style={styles.loading}>No analytics data available.</div>;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];
  const xAxisProps = {
    dataKey: "month",
    interval: 0,
    height: 60,
    axisLine: { stroke: "#ccc" },
    tickLine: { stroke: "#ccc", width: 1 },
    tick: { fill: "#333", fontSize: 12 },
    angle: -45,
    textAnchor: "end",
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Analytics Dashboard</h1>
      </header>

      {/* ── Date-Range Filter ───────────────────────────────────── */}
      <section style={styles.filterRow}>
        <label>
          From{" "}
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>
        <label>
          To{" "}
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>
        <button
          style={styles.applyBtn}
          onClick={() => fetchAnalytics(startDate, endDate)}
        >
          Apply
        </button>
      </section>

      {/* ── Summary Cards ──────────────────────────────────────── */}
      <section style={styles.cardsRow}>
        {[
          ["Posts This Month", overview.postsThisMonth],
          ["Total Posts",       overview.totalPosts],
          ["Sales This Month",  overview.salesThisMonth],
          ["Total Sales",       overview.totalSales],
        ].map(([label, value], i) => (
          <div key={i} style={styles.card}>
            <p style={styles.cardLabel}>{label}</p>
            <p style={styles.cardValue}>{value}</p>
          </div>
        ))}
      </section>

      {/* ── Charts Grid ───────────────────────────────────────── */}
      <section style={styles.chartsGrid}>

        {/* Listings per Month */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Listings per Month</h3>
          {postsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={postsByMonth} margin={{ bottom: 20 }}>
                <XAxis {...xAxisProps} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <CartesianGrid stroke="#eee" />
                <Line type="monotone" dataKey="count" stroke="#5A2D76" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.emptyMessage}>No listings data.</p>
          )}
        </div>

        {/* Sales per Month */}
        <div style={styles.chartBox}>
          <h3 style={styles.chartTitle}>Sales per Month</h3>
          {salesByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesByMonth} margin={{ bottom: 20 }}>
                <XAxis {...xAxisProps} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <CartesianGrid stroke="#eee" />
                <Bar dataKey="count" fill="#f7c800" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.emptyMessage}>No sales data.</p>
          )}
        </div>

        {/* Sales by Category (full-width) */}
        <div style={{ ...styles.chartBox, gridColumn: "1 / -1" }}>
          <h3 style={styles.chartTitle}>Sales by Category</h3>
          {salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={salesByCategory}
                  dataKey="value"
                  nameKey="category"
                  outerRadius={80}
                  label={({ category, percent }) =>
                    `${category}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {salesByCategory.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.emptyMessage}>No category data.</p>
          )}
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: "#f4f4f4",
    padding: "2rem",
    fontFamily: "'Segoe UI', sans-serif",
    minHeight: "100vh",
  },
  loading: {
    padding: "2rem",
    textAlign: "center",
    fontSize: "1.2rem",
  },
  header: {
    backgroundColor: "#5A2D76",
    padding: "1.5rem",
    borderRadius: "8px",
    marginBottom: "2rem",
    color: "#fff",
    textAlign: "center",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.8rem",
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  applyBtn: {
    padding: "6px 12px",
    backgroundColor: "#5A2D76",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  cardsRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "2rem",
  },
  card: {
    flex: "1 1 200px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    padding: "1rem",
    textAlign: "center",
  },
  cardLabel: {
    margin: 0,
    color: "#666",
    fontSize: "0.9rem",
  },
  cardValue: {
    margin: "0.5rem 0 0",
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#f7c800",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
  },
  chartBox: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    padding: "1rem",
  },
  chartTitle: {
    margin: "0 0 0.5rem",
    color: "#222",
    fontSize: "1.1rem",
  },
  emptyMessage: {
    textAlign: "center",
    color: "#888",
    marginTop: "1rem",
  },
};
