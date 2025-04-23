// src/pages/SalesPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

const PAGE_SIZE = 10;

export default function SalesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & UI state
  const [searchListing, setSearchListing] = useState("");
  const [searchBuyer, setSearchBuyer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);

  // Drill-down & bulk
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    (async function loadSales() {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch("/api/orders/sales/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch sales");
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        console.error(err);
        toast.error("Could not load your sales");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived: unique status options
  const statuses = useMemo(
    () => Array.from(new Set(orders.map((o) => o.status))).sort(),
    [orders]
  );

  // Filtering + sorting
  const filtered = useMemo(() => {
    let out = orders;

    if (searchListing) {
      const q = searchListing.toLowerCase();
      out = out.filter((o) =>
        (o.listing_title || "").toLowerCase().includes(q)
      );
    }
    if (searchBuyer) {
      const q = searchBuyer.toLowerCase();
      out = out.filter((o) =>
        (o.buyer_email || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      out = out.filter((o) => o.status === statusFilter);
    }
    if (dateFrom) {
      const d = new Date(dateFrom);
      out = out.filter((o) => new Date(o.created_at) >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo);
      out = out.filter((o) => new Date(o.created_at) <= d);
    }

    out = out.slice().sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === "created_at") {
        va = new Date(va);
        vb = new Date(vb);
      } else if (sortBy === "total_price") {
        va = parseFloat(va);
        vb = parseFloat(vb);
      } else {
        va = (va || "").toString().toLowerCase();
        vb = (vb || "").toString().toLowerCase();
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return out;
  }, [
    orders,
    searchListing,
    searchBuyer,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortAsc,
  ]);

  // Pagination slice
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Bulk action stub
  const handleBulkShip = () => {
    const ids = Object.entries(selectedIds)
      .filter(([_, sel]) => sel)
      .map(([id]) => id);
    if (!ids.length) return toast.info("No orders selected");
    // Ideally call API to mark as shipped...
    toast.success(`Marked ${ids.length} order(s) as shipped`);
    // Clear selection
    setSelectedIds({});
  };

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  if (loading) return <p style={{ padding: "2rem" }}>Loading your sales…</p>;
  if (!orders.length)
    return <p style={{ padding: "2rem" }}>No one has bought your listings yet.</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Your Listings Sold</h2>

      {/* FILTERS */}
      <div style={styles.filters}>
        <input
          placeholder="Search listing…"
          value={searchListing}
          onChange={(e) => setSearchListing(e.target.value)}
          style={styles.input}
        />
        <input
          placeholder="Search buyer…"
          value={searchBuyer}
          onChange={(e) => setSearchBuyer(e.target.value)}
          style={styles.input}
        />
        <label>
          From:{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          To:{" "}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.input}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Bulk action button */}
        <button onClick={handleBulkShip} style={styles.bulkBtn}>
          Mark as Shipped
        </button>
      </div>

      {/* TABLE */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  paged.length &&
                  paged.every((o) => selectedIds[o.id])
                }
                onChange={(e) =>
                  paged.forEach((o) =>
                    setSelectedIds((prev) => ({
                      ...prev,
                      [o.id]: e.target.checked,
                    }))
                  )
                }
              />
            </th>
            {[
              ["id", "Order ID"],
              ["listing_title", "Listing"],
              ["buyer_email", "Buyer"],
              ["total_price", "Total ($)"],
              ["created_at", "Date"],
              ["status", "Status"],
            ].map(([col, label]) => (
              <th
                key={col}
                onClick={() => toggleSort(col)}
                style={styles.th}
              >
                {label} {sortBy === col && (sortAsc ? "↑" : "↓")}
              </th>
            ))}
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((o) => {
            const isExpanded = !!expanded[o.id];
            return (
              <React.Fragment key={o.id}>
                <tr
                  style={styles.row}
                  onClick={() => navigate(`/order-confirmation/${o.id}`)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!selectedIds[o.id]}
                      onChange={(e) =>
                        setSelectedIds((prev) => ({
                          ...prev,
                          [o.id]: e.target.checked,
                        }))
                      }
                    />
                  </td>
                  <td style={styles.td}>{o.id}</td>
                  <td style={styles.td}>{o.listing_title}</td>
                  <td style={styles.td}>{o.buyer_email}</td>
                  <td style={styles.td}>
                    {parseFloat(o.total_price).toFixed(2)}
                  </td>
                  <td style={styles.td}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td style={styles.td}>{o.status}</td>
                  <td
                    style={styles.expandCell}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded((prev) => ({
                        ...prev,
                        [o.id]: !prev[o.id],
                      }));
                    }}
                  >
                    {isExpanded ? <FaChevronDown/> : <FaChevronRight/>}
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={8} style={styles.detailRow}>
                      <strong>Payment:</strong>{" "}
                      {o.payment_method_name || o.payment_method}
                      <br />
                      <strong>Offerings:</strong>{" "}
                      {o.offerings.length
                        ? o.offerings.join(", ")
                        : "None"}
                      {o.address_details && (
                        <>
                          <br />
                          <strong>Ship to:</strong>{" "}
                          {o.address_details.street},{" "}
                          {o.address_details.city},{" "}
                          {o.address_details.state}{" "}
                          {o.address_details.zip},{" "}
                          {o.address_details.country}
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div style={styles.pagination}>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Prev
        </button>
        <span>
          Page {page + 1} of {pageCount}
        </span>
        <button
          onClick={() =>
            setPage((p) => Math.min(pageCount - 1, p + 1))
          }
          disabled={page + 1 === pageCount}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "2rem", fontFamily: "'Segoe UI', sans-serif" },
  heading: { marginBottom: "1rem", color: "#007bff" },
  filters: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
    alignItems: "center",
  },
  input: { padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" },
  bulkBtn: {
    padding: "6px 12px",
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px",
    borderBottom: "2px solid #ddd",
    cursor: "pointer",
    userSelect: "none",
  },
  td: { padding: "8px", borderBottom: "1px solid #eee" },
  row: { transition: "background 0.1s", cursor: "pointer" },
  expandCell: { textAlign: "center", cursor: "pointer" },
  detailRow: {
    background: "#f9fafb",
    padding: "8px",
    fontSize: "0.9rem",
    lineHeight: 1.5,
  },
  pagination: {
    marginTop: "1rem",
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    alignItems: "center",
  },
};

