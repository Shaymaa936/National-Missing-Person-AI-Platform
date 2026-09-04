import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE } from "../../api/apiClient";

const CONTACT_API = `${API_BASE}/api/contact`;

export default function ContactMessages({ logAudit, toast, fmtAdmin }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cStatus, setCStatus] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    setLoading(true);

    fetch(`${CONTACT_API}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const normalized = data.data.map((c) => ({
            ...c,
            status: c.status ? c.status.toLowerCase() : "new",
          }));

          setContacts(normalized);
        } else {
          toast?.("Failed to load contact messages");
        }
      })
      .catch((err) => {
        console.error(err);
        toast?.("Could not reach server");
      })
      .finally(() => setLoading(false));
  }, []);

  const markContactRead = async (id) => {
    console.log("🟢 markContactRead called for ID:", id);

    setContacts((prev) =>
      prev.map((c) => (c._id === id ? { ...c, status: "read" } : c))
    );

    setUpdatingId(id);

    try {
      const res = await fetch(`${CONTACT_API}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: "Read" }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (data.success) {
        logAudit?.(
          "CONTACT_READ",
          `Marked contact message ${id} as read`
        );

        toast?.("Marked as read");
      } else {
        setContacts((prev) =>
          prev.map((c) =>
            c._id === id ? { ...c, status: "new" } : c
          )
        );

        toast?.("Failed to update: " + (data.message || ""));
      }
    } catch (err) {
      console.error("❌ Error:", err);

      setContacts((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, status: "new" } : c
        )
      );

      toast?.(`Network error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteContactMsg = async (id) => {
    if (!window.confirm("Delete this message?")) return;

    const prevContacts = contacts;

    setContacts((prev) =>
      prev.filter((c) => c._id !== id)
    );

    setUpdatingId(id);

    try {
      const res = await fetch(`${CONTACT_API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        logAudit?.(
          "CONTACT_DELETED",
          `Deleted contact message ${id}`,
          "warn"
        );

        toast?.("Message deleted");
      } else {
        setContacts(prevContacts);
        toast?.("Failed to delete: " + data.message);
      }
    } catch (err) {
      console.error("❌ Delete error:", err);

      setContacts(prevContacts);
      toast?.("Network error – couldn't delete");
    } finally {
      setUpdatingId(null);
    }
  };

  const contactRows = contacts.filter(
    (c) => !cStatus || c.status === cStatus
  );

  return (
    <div className="panel">
      <div className="filter-bar">
        <select
          value={cStatus}
          onChange={(e) => setCStatus(e.target.value)}
        >
          <option value="">All messages</option>
          <option value="new">New</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="tbl-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Message</th>
              <th>Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    Loading messages…
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              contactRows.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>

                  <td
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-supporting)",
                    }}
                  >
                    {c.email}
                  </td>

                  <td>{c.phone || "—"}</td>

                  <td
                    style={{
                      maxWidth: 260,
                      whiteSpace: "normal",
                    }}
                  >
                    {c.message}
                  </td>

                  <td>
                    {fmtAdmin
                      ? fmtAdmin(c.createdAt)
                      : new Date(
                          c.createdAt
                        ).toLocaleDateString()}
                  </td>

                  <td>
                    {c.status === "new" ? (
                      <span className="badge badge-rejected">
                        New
                      </span>
                    ) : (
                      <span className="badge badge-found">
                        Read
                      </span>
                    )}
                  </td>

                  <td className="row-actions">
                    {c.status === "new" && (
                      <button
                        className="icon-btn"
                        title="Mark as read"
                        onClick={() =>
                          markContactRead(c._id)
                        }
                        disabled={updatingId === c._id}
                      >
                        {updatingId === c._id ? "⏳" : "✓"}
                      </button>
                    )}

                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() =>
                        deleteContactMsg(c._id)
                      }
                      disabled={updatingId === c._id}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}

            {!loading && contactRows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    {cStatus
                      ? `No ${cStatus} messages found.`
                      : "No messages available."}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}