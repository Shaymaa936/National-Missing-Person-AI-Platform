import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";



import StatusBadge from "../../components/StatusBadge";
import CaseDetailModal from "../../components/admin/CaseDetailModal";
import FoundDetailModal from "../../components/admin/FoundDetailModal";
import MatchCard from "../../components/admin/MatchCard";

import {
  statusLabel,
  roleLabel,
  fmtAdmin,
  nowStr,
} from "../../data/adminMockData";

import {
  fetchFaceMatches,
  reviewFaceMatch,
  fetchEngineHealth,
  runFaceMatchForReportApi,
  runAllFaceMatchesApi,
  toMockShape,
} from "../../api/faceMatchApi";

import Toast from "../../components/admin/Toast";
import logo from "../../assets/logo.png";

import {
  fetchAllTips,
  updateTipStatusApi,
  deleteTipApi,
  toTipShape,
} from "../../api/tipsApi";

import {
  fetchUsers,
  updateUserRoleApi,
  updateUserStatusApi,
  deleteUserApi,
  toUserShape,
} from "../../api/usersApi";

import {
  fetchAuditLogs,
  createAuditLogApi,
  downloadAuditLogsCsv,
  deleteAuditLogApi,
  toAuditShape,
} from "../../api/auditApi";

import ContactMessages from "../../components/admin/ContactMessages";


const NAV = [
  { grp: "Overview" },

  {
    id: "dashboard",
    label: "Dashboard",
    icon: "fa-solid fa-gauge-high",
  },

  { grp: "Case Management" },

  {
    id: "missing",
    label: "Missing Cases",
    icon: "fa-solid fa-user",
    count: (d) => d.cases.length,
  },

  {
    id: "found",
    label: "Found Reports",
    icon: "fa-solid fa-circle-check",
    count: (d) => d.adminFounds.length,
  },

  {
    id: "tips",
    label: "Community Tips",
    icon: "fa-solid fa-envelope",
    count: (d) =>
      d.tips.filter((t) => t.status === "pending").length,
  },

  { grp: "AI & Trust" },

  {
    id: "facematch",
    label: "AI Face-Match Review",
    icon: "fa-solid fa-camera",
    count: (d) =>
      d.faceMatches.filter((m) => m.status === "pending").length,
  },

  { grp: "Platform" },

  {
    id: "users",
    label: "Users & Roles",
    icon: "fa-solid fa-users",
    count: (d) => d.users.length,
  },

  {
    id: "contacts",
    label: "Contact Messages",
    icon: "fa-solid fa-phone",
  },

  {
    id: "audit",
    label: "Audit Log",
    icon: "fa-solid fa-clipboard-list",
  },
];


const TITLES = {
  dashboard: ["Overview", "Live snapshot of platform activity"],

  missing: [
    "Missing-Person Cases",
    "Search, filter and update case status",
  ],

  found: [
    "Found / Unidentified Reports",
    "Reports submitted by the community",
  ],

  tips: [
    "Community Tips",
    "Review tips submitted against active cases",
  ],

  facematch: [
    "AI Face-Match Review",
    "Human-in-the-loop review of AI-suggested matches",
  ],

  users: [
    "Users & Roles",
    "Manage platform accounts and access",
  ],

  contacts: [
    "Contact Messages",
    "Messages submitted via the public Contact Us form",
  ],

  audit: [
    "Audit Log",
    "Every sensitive action, recorded",
  ],
};


export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    cases,
    founds,
    adminFounds,
    updateCaseStatus: updateCaseStatusData,
    deleteCase,
    approveFound,
    deleteFound,
  } = useData();


  const [section, setSection] = useState("dashboard");

  const [tips, setTips] = useState([]);
  const [tipsLoading, setTipsLoading] = useState(true);

  const [faceMatches, setFaceMatches] = useState([]);
  const [fmLoading, setFmLoading] = useState(true);
  const [fmError, setFmError] = useState("");

  const [engineOnline, setEngineOnline] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [auditLog, setAuditLog] = useState([]);

  const [modalCaseId, setModalCaseId] = useState(null);
  const [modalFoundId, setModalFoundId] = useState(null);

  const [toastMsg, setToastMsg] = useState("");
  const [roleMenuFor, setRoleMenuFor] = useState(null);


  // filters
  const [mCity, setMCity] = useState("");
  const [mStatus, setMStatus] = useState("");
  const [mSearch, setMSearch] = useState("");

  const [tStatus, setTStatus] = useState("");

  const [fmStatus, setFmStatus] = useState("pending");

  const [uRole, setURole] = useState("");
  const [uSearch, setUSearch] = useState("");


  const actorName = user?.name
    ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
    : "Admin User";


  const ROLES = [
    "admin",
    "investigator",
    "police",
    "dpo",
    "reporter",
    "tipster",
    "ngo",
  ];
  const isAdmin = user?.role === "admin";
const isInvestigator = user?.role === "investigator";
const isPolice = user?.role === "police";
const isDpo = user?.role === "dpo";
const isReporter = user?.role === "reporter";
const isTipster = user?.role === "tipster";
const isNgo = user?.role === "ngo";

const isStaff = [
  "admin",
  "investigator",
  "police",
  "dpo",
  "reporter",
  "tipster",
  "ngo",
].includes(user?.role);


  function toast(msg) {
    setToastMsg(msg);

    setTimeout(() => setToastMsg(""), 2600);
  }


  function logAudit(action, detail, kind = "info") {
    if (user?.role !== "admin") return;

    setAuditLog((prev) => [
      {
        actor: actorName,
        action,
        detail,
        ts: nowStr(),
        kind,
      },
      ...prev,
    ]);

    const token = localStorage.getItem("token");

    createAuditLogApi(token, {
      action,
      detail,
      kind,
      actor: actorName,
    }).catch((err) => {
      console.error("Failed to persist audit log:", err);
    });
  }


  const loadTips = useCallback(async () => {
    setTipsLoading(true);

    try {
      const token = localStorage.getItem("token");

      const raw = await fetchAllTips(token);

      setTips(raw.map(toTipShape));
    } catch (error) {
      console.error("Load tips error:", error);

      toast("Could not load tips — is the backend running?");
    } finally {
      setTipsLoading(false);
    }
  }, []);


 const loadUsers = useCallback(async () => {
  // Users & Roles sirf admin ke liye
  if (!isAdmin) return;

  setUsersLoading(true);

  try {
    const token = localStorage.getItem("token");

    const raw = await fetchUsers(token);

    setUsers(raw.map(toUserShape));
  } catch (error) {
    console.error("Load users error:", error);

    toast("Could not load users — is the backend running?");
  } finally {
    setUsersLoading(false);
  }
}, [isAdmin]);


  const loadAuditLogs = useCallback(async () => {
    if (user?.role !== "admin") return;

    try {
      const token = localStorage.getItem("token");

      const raw = await fetchAuditLogs(token);

      setAuditLog(raw.map(toAuditShape));
    } catch (error) {
      console.error("Load audit log error:", error);

      toast("Could not load audit log — is the backend running?");
    }
  }, []);

useEffect(() => {
  loadTips();

  if (isAdmin) {
    loadUsers();
    loadAuditLogs();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAdmin]);



  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }


  const caseById = (id) =>
    cases.find((c) => c.id === id);


  const foundById = (id) =>
    adminFounds.find((f) => f.id === id);


  function updateCaseStatus(id, newStatus) {
    const old = caseById(id)?.status;

    updateCaseStatusData(id, newStatus);

    logAudit(
      "STATUS_UPDATE",
      `${id} status changed from ${statusLabel(old)} to ${statusLabel(
        newStatus
      )}`
    );

    toast(`${id} marked as ${statusLabel(newStatus)}`);
  }


  async function handleDeleteCase(id) {
    try {
      await deleteCase(id);

      logAudit(
        "CASE_DELETED",
        `Deleted case ${id}`,
        "warn"
      );

      toast("Case deleted successfully");

      setModalCaseId(null);
    } catch (err) {
      toast("Failed to delete case");
    }
  }


  async function handleApproveFound(id) {
    try {
      await approveFound(id);

      logAudit(
        "FOUND_APPROVED",
        `Approved found report ${id}`,
        "success"
      );

      toast(`${id} approved and published`);
    } catch (error) {
      console.error("Approve failed:", error);

      toast("Failed to approve report");
    }
  }


  async function handleDeleteFound(id) {
    try {
      await deleteFound(id);

      logAudit(
        "FOUND_DELETED",
        `Deleted found report ${id}`,
        "warn"
      );

      toast("Report deleted successfully");

      setModalFoundId(null);
    } catch (err) {
      toast("Failed to delete report");
    }
  }


  const loadFaceMatches = useCallback(async () => {
    setFmLoading(true);
    setFmError("");

    try {
      const token = localStorage.getItem("token");

      const raw = await fetchFaceMatches(token);

      setFaceMatches(raw.map(toMockShape));
    } catch (error) {
      setFmError(
        "Could not load AI face-match data. Is the backend running?"
      );
    } finally {
      setFmLoading(false);
    }
  }, []);


  useEffect(() => {
    loadFaceMatches();

    fetchEngineHealth(
      localStorage.getItem("token")
    ).then((h) =>
      setEngineOnline(!!h?.deepface_available)
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function sendFaceMatch(id) {
    toast("Running AI face-matching engine...");

    try {
      const token = localStorage.getItem("token");

      const result =
        await runFaceMatchForReportApi(
          token,
          id
        );

      await loadFaceMatches();

      logAudit(
        "RUN_FACE_MATCH",
        `Ran AI face match for ${id}: ${
          result.matchesCount || 0
        } match(es) found`,
        (result.matchesCount || 0) > 0
          ? "success"
          : "info"
      );

      toast(
        result.message ||
          `Face match complete: ${
            result.matchesCount || 0
          } match(es) found`
      );
    } catch (error) {
      console.error(
        "Run face match error:",
        error
      );

      toast(
        error.message ||
          "Face matching failed"
      );
    }
  }


  async function handleRunAllMatches() {
    toast(
      "Running AI scan across all reports..."
    );

    try {
      const token =
        localStorage.getItem("token");

      const result =
        await runAllFaceMatchesApi(token);

      await loadFaceMatches();

      logAudit(
        "RUN_FACE_MATCH",
        `Ran AI scan on all cases: ${
          result.totalMatches || 0
        } candidate(s)`,
        "success"
      );

      toast(
        result.message ||
          "Scan complete!"
      );
    } catch (error) {
      console.error(
        "Scan all error:",
        error
      );

      toast(
        error.message ||
          "Failed to run scan"
      );
    }
  }


  async function approveTip(id) {
    try {
      const token =
        localStorage.getItem("token");

      await updateTipStatusApi(
        token,
        id,
        "approved"
      );

      setTips((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "approved",
              }
            : t
        )
      );

      logAudit(
        "TIP_APPROVED",
        `Approved tip ${id}`,
        "success"
      );

      toast("Tip approved");
    } catch (error) {
      console.error(
        "Approve tip error:",
        error
      );

      toast("Failed to approve tip");
    }
  }


  async function handleDeleteTip(id) {
    try {
      const token =
        localStorage.getItem("token");

      await deleteTipApi(token, id);

      setTips((prev) =>
        prev.filter((t) => t.id !== id)
      );

      logAudit(
        "TIP_DELETED",
        `Deleted tip ${id}`,
        "warn"
      );

      toast("Tip deleted");
    } catch (error) {
      console.error(
        "Delete tip error:",
        error
      );

      toast("Failed to delete tip");
    }
  }


  async function reviewMatch(
    id,
    decision
  ) {
    const apiStatus =
      decision === "confirmed"
        ? "Confirmed"
        : "Rejected";

    try {
      const token =
        localStorage.getItem("token");

      await reviewFaceMatch(
        token,
        id,
        apiStatus
      );

      setFaceMatches((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: decision,
              }
            : m
        )
      );

      logAudit(
        "RUN_FACE_MATCH",
        `Reviewed AI match ${id} → ${statusLabel(
          decision
        )}`,
        decision === "confirmed"
          ? "success"
          : "info"
      );

      toast(
        decision === "confirmed"
          ? "Match confirmed — case marked Found"
          : "Match rejected"
      );
    } catch (error) {
      toast(
        "Could not update match — try again"
      );
    }
  }


  async function toggleUserStatus(id) {
    const u = users.find(
      (x) => x.id === id
    );

    if (!u) return;

    const next =
      u.status === "active"
        ? "suspended"
        : "active";

    try {
      const token =
        localStorage.getItem("token");

      await updateUserStatusApi(
        token,
        id,
        next
      );

      setUsers((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: next,
              }
            : x
        )
      );

      logAudit(
        next === "suspended"
          ? "USER_SUSPENDED"
          : "USER_REACTIVATED",
        `${
          next === "suspended"
            ? "Suspended"
            : "Reactivated"
        } account ${id} (${u.name})`,
        next === "suspended"
          ? "warn"
          : "info"
      );

      toast(
        `${u.name} ${
          next === "suspended"
            ? "suspended"
            : "reactivated"
        }`
      );
    } catch (error) {
      console.error(
        "Toggle user status error:",
        error
      );

      toast(
        "Failed to update user status"
      );
    }
  }


  async function deleteUser(id) {
    const u = users.find(
      (x) => x.id === id
    );

    try {
      const token =
        localStorage.getItem("token");

      await deleteUserApi(token, id);

      setUsers((prev) =>
        prev.filter((x) => x.id !== id)
      );

      logAudit(
        "USER_DELETED",
        `Deleted account ${id}${
          u ? ` (${u.name})` : ""
        }`,
        "warn"
      );

      toast(
        `${u ? u.name : id} deleted`
      );
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      toast("Failed to delete user");
    }
  }


  async function assignRole(id, role) {
    const u = users.find(
      (x) => x.id === id
    );

    try {
      const token =
        localStorage.getItem("token");

      await updateUserRoleApi(
        token,
        id,
        role
      );

      setUsers((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                role,
              }
            : x
        )
      );

      logAudit(
        "ROLE_ASSIGNED",
        `${
          u ? u.name : id
        } assigned role ${roleLabel(
          role
        )}`,
        "info"
      );

      toast(
        `${u ? u.name : id} is now ${roleLabel(
          role
        )}`
      );
    } catch (error) {
      console.error(
        "Assign role error:",
        error
      );

      toast(
        "Failed to update role"
      );
    } finally {
      setRoleMenuFor(null);
    }
  }


  async function handleExportAudit() {
    try {
      const token =
        localStorage.getItem("token");

      await downloadAuditLogsCsv(token);

      toast("Audit log exported");
    } catch (error) {
      console.error(
        "Export audit error:",
        error
      );

      toast(
        "Failed to export audit log"
      );
    }
  }


  async function handleDeleteAudit(id) {
    if (user?.role !== "admin") {
      toast(
        "Only admin can delete audit logs"
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this audit log?"
      );

    if (!confirmed) return;

    try {
      const token =
        localStorage.getItem("token");

      await deleteAuditLogApi(
        token,
        id
      );

      setAuditLog((prev) =>
        prev.filter(
          (log) => log.id !== id
        )
      );

      toast("Audit log deleted");
    } catch (error) {
      console.error(
        "Delete audit log error:",
        error
      );

      toast(
        error.message ||
          "Failed to delete audit log"
      );
    }
  }


  function viewRestricted(id) {
    if (user?.role !== "admin") {
      toast(
        "Only admin can access restricted information"
      );

      return;
    }

    logAudit(
      "VIEW_CNIC",
      `Viewed restricted info for ${id}`,
      "warn"
    );

    toast(
      "CNIC & restricted info access logged"
    );
  }


  const cities = useMemo(
    () => [
      ...new Set(
        cases.map((c) => c.city)
      ),
    ],
    [cases]
  );


  const missingRows = useMemo(
    () =>
      cases.filter(
        (c) =>
          (!mCity ||
            c.city === mCity) &&
          (!mStatus ||
            c.status === mStatus) &&
          (!mSearch ||
            c.name
              .toLowerCase()
              .includes(
                mSearch.toLowerCase()
              ) ||
            c.id
              .toLowerCase()
              .includes(
                mSearch.toLowerCase()
              ))
      ),
    [
      cases,
      mCity,
      mStatus,
      mSearch,
    ]
  );


  const tipRows = useMemo(
    () =>
      tips.filter(
        (t) =>
          !tStatus ||
          t.status === tStatus
      ),
    [tips, tStatus]
  );


  const matchRows = useMemo(
    () =>
      faceMatches.filter(
        (m) =>
          !fmStatus ||
          m.status === fmStatus
      ),
    [faceMatches, fmStatus]
  );


  const userRows = useMemo(
    () =>
      users.filter(
        (u) =>
          (!uRole ||
            u.role === uRole) &&
          (!uSearch ||
            u.name
              .toLowerCase()
              .includes(
                uSearch.toLowerCase()
              ) ||
            u.email
              .toLowerCase()
              .includes(
                uSearch.toLowerCase()
              ))
      ),
    [users, uRole, uSearch]
  );


  const kpiActive =
    cases.filter(
      (c) => c.status === "active"
    ).length;


  const kpiInvestigating =
    cases.filter(
      (c) =>
        c.status ===
        "investigating"
    ).length;


  const kpiFound =
    cases.filter(
      (c) => c.status === "found"
    ).length;


  const kpiPendingTips =
    tips.filter(
      (t) => t.status === "pending"
    ).length;


  const kpiPendingMatches =
    faceMatches.filter(
      (m) => m.status === "pending"
    ).length;


  function goToKpi(
    targetSection,
    filterFn
  ) {
    if (filterFn) filterFn();

    setSection(targetSection);
  }


  const dataForCounts = {
    cases,
    founds,
    adminFounds,
    tips,
    faceMatches,
    users,
  };


  const [title, subtitle] =
    TITLES[section];


  return (
    <div className="admin-shell">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="brand">
          <div className="logo">
            <img
              src={logo}
              alt="Trace"
              className="mark"
            />
            Trace
          </div>
        </div>


        <nav className="admin-nav">
      {NAV.filter((n) => {
  // Groups ko show rehne do
  if (n.grp) return true;

  // Users & Roles sirf admin
  if (n.id === "users") return isAdmin;

  // Audit Log sirf admin
  if (n.id === "audit") return isAdmin;

  // Baqi staff roles ko sections show hon
  return isStaff;
}).map((n, i)  =>
            n.grp ? (
              <div
                key={i}
                className="grp"
              >
                {n.grp}
              </div>
            ) : (
              <div
                key={n.id}
                className={`item ${
                  section === n.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSection(n.id)
                }
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="icon">
                    <i
                      className={n.icon}
                      aria-hidden="true"
                    />
                  </span>

                  {n.label}
                </span>

                {n.count && (
                  <span className="count">
                    {n.count(
                      dataForCounts
                    )}
                  </span>
                )}
              </div>
            )
          )}
        </nav>


        <div className="admin-who">

          <div className="admin-who-row">

            <div className="admin-avatar">
              {actorName.charAt(0)}
            </div>

            <div>
              <p
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {actorName}
              </p>

              <p
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                }}
              >
                {roleLabel(user?.role)}
              </p>
            </div>

          </div>


          <button
            className="btn btn-outline btn-sm btn-block"
            onClick={handleLogout}
            style={{
              borderColor:
                "rgba(255,255,255,.25)",
              color: "#E2E8F0",
            }}
          >
            <i
              className="fa-solid fa-right-from-bracket"
              aria-hidden="true"
            />{" "}
            Sign Out
          </button>

        </div>

      </aside>


      {/* MAIN */}
      <main className="admin-main">

        <div className="admin-topbar">

          <div>
            <h2
              style={{
                fontSize: 20,
              }}
            >
              {title}
            </h2>

            <p
              style={{
                fontSize: 13,
              }}
            >
              {subtitle}
            </p>
          </div>


          <div
            style={{
              fontSize: 12.5,
              color:
                "var(--text-supporting)",
            }}
          >
            {user?.email}
          </div>

        </div>


        <div className="admin-content">

          {/* DASHBOARD */}
          {section === "dashboard" && (
            <>

              <div className="kpi-grid">

                {/* ACTIVE CASES */}
                <div
                  className="kpi"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    goToKpi(
                      "missing",
                      () => {
                        setMStatus(
                          "active"
                        );
                        setMCity("");
                        setMSearch("");
                      }
                    )
                  }
                >
                  <div className="top">

                    <div
                      className="ic"
                      style={{
                        background:
                          "#FFF7ED",
                        color:
                          "var(--emergency)",
                      }}
                    >
                      <i
                        className="fa-solid fa-user"
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className="trend"
                      style={{
                        color:
                          "var(--emergency)",
                      }}
                    >
                      +2 wk
                    </span>

                  </div>

                  <div className="val">
                    {kpiActive}
                  </div>

                  <div className="lbl">
                    Active cases
                  </div>
                </div>


                {/* INVESTIGATING */}
                <div
                  className="kpi"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    goToKpi(
                      "missing",
                      () => {
                        setMStatus(
                          "investigating"
                        );
                        setMCity("");
                        setMSearch("");
                      }
                    )
                  }
                >
                  <div className="top">

                    <div
                      className="ic"
                      style={{
                        background:
                          "#FFFBEB",
                        color:
                          "#7A5F1E",
                      }}
                    >
                      <i
                        className="fa-solid fa-magnifying-glass"
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className="trend"
                      style={{
                        color:
                          "#7A5F1E",
                      }}
                    >
                      {kpiInvestigating}
                    </span>

                  </div>

                  <div className="val">
                    {kpiInvestigating}
                  </div>

                  <div className="lbl">
                    Under investigation
                  </div>
                </div>


                {/* RESOLVED */}
                <div
                  className="kpi"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    goToKpi(
                      "missing",
                      () => {
                        setMStatus(
                          "found"
                        );
                        setMCity("");
                        setMSearch("");
                      }
                    )
                  }
                >
                  <div className="top">

                    <div
                      className="ic"
                      style={{
                        background:
                          "#ECFDF5",
                        color:
                          "#059669",
                      }}
                    >
                      <i
                        className="fa-solid fa-circle-check"
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className="trend"
                      style={{
                        color:
                          "#059669",
                      }}
                    >
                      Reunited
                    </span>

                  </div>

                  <div className="val">
                    {kpiFound}
                  </div>

                  <div className="lbl">
                    Cases resolved
                  </div>
                </div>


                {/* TIPS */}
                <div
                  className="kpi"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    goToKpi(
                      "tips",
                      () =>
                        setTStatus(
                          "pending"
                        )
                    )
                  }
                >
                  <div className="top">

                    <div
                      className="ic"
                      style={{
                        background:
                          "var(--bg-subtle)",
                        color:
                          "var(--text-supporting)",
                      }}
                    >
                      <i
                        className="fa-solid fa-envelope"
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className="trend"
                      style={{
                        color:
                          "var(--text-supporting)",
                      }}
                    >
                      Queue
                    </span>

                  </div>

                  <div className="val">
                    {kpiPendingTips}
                  </div>

                  <div className="lbl">
                    Tips pending review
                  </div>
                </div>


                {/* FACE MATCH */}
                <div
                  className="kpi"
                  style={{
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    goToKpi(
                      "facematch",
                      () =>
                        setFmStatus(
                          "pending"
                        )
                    )
                  }
                >
                  <div className="top">

                    <div
                      className="ic"
                      style={{
                        background:
                          "#EFF6FF",
                        color:
                          "#1D4ED8",
                      }}
                    >
                      <i
                        className="fa-solid fa-camera"
                        aria-hidden="true"
                      />
                    </div>

                    <span
                      className="trend"
                      style={{
                        color:
                          "#1D4ED8",
                      }}
                    >
                      AI
                    </span>

                  </div>

                  <div className="val">
                    {kpiPendingMatches}
                  </div>

                  <div className="lbl">
                    Face-matches pending
                  </div>
                </div>

              </div>


              {/* TWO COLUMNS */}
              <div className="two-col">

                {/* RECENT CASES */}
                <div className="panel">

                  <div className="panel-head">

                    <div>
                      <h3>
                        Recent Cases
                      </h3>

                      <p>
                        Latest missing-person reports
                      </p>
                    </div>

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        setSection(
                          "missing"
                        )
                      }
                    >
                      View all{" "}
                      <i
                        className="fa-solid fa-arrow-right"
                        aria-hidden="true"
                      />
                    </button>

                  </div>


                  <div className="tbl-wrap">

                    <table className="data">

                      <thead>
                        <tr>
                          <th>Case</th>
                          <th>City</th>
                          <th>Last seen</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>

                        {cases
                          .slice(0, 5)
                          .map((c) => (
                            <tr
                              key={c.id}
                              style={{
                                cursor:
                                  "pointer",
                              }}
                              onClick={() =>
                                setModalCaseId(
                                  c.id
                                )
                              }
                            >
                              <td>
                                <div className="cell-person">

                                  <img
                                    src={c.photo}
                                    alt={c.name}
                                  />

                                  <div>
                                    <div className="nm">
                                      {c.name}
                                    </div>

                                    <div className="sub mono">
                                      {c.id}
                                    </div>
                                  </div>

                                </div>
                              </td>

                              <td>
                                {c.city}
                              </td>

                              <td>
                                {fmtAdmin(
                                  c.lastSeen
                                )}
                              </td>

                              <td>
                                <StatusBadge
                                  status={
                                    c.status
                                  }
                                />
                              </td>

                            </tr>
                          ))}

                      </tbody>

                    </table>

                  </div>

                </div>


                {/* ACTIVITY */}
                <div className="panel">

                  <div className="panel-head">

                    <div>
                      <h3>
                        Activity
                      </h3>

                      <p>
                        Latest platform actions
                      </p>
                    </div>

                  </div>


                  <div>

                    {auditLog
                      .slice(0, 5)
                      .map((a, i) => (
                        <div
                          key={i}
                          className="audit-item"
                        >

                          <div
                            className="dot"
                            style={{
                              background:
                                a.kind ===
                                "warn"
                                  ? "#D97706"
                                  : a.kind ===
                                    "success"
                                  ? "#059669"
                                  : "var(--emergency)",
                            }}
                          />

                          <div className="txt">

                            <div className="a1">
                              <b>
                                {a.actor}
                              </b>{" "}
                              — {a.detail}
                            </div>

                            <div className="a2 mono">
                              {a.action}
                            </div>

                          </div>

                        </div>
                      ))}

                  </div>

                </div>

              </div>


              {/* FACE MATCH PREVIEW */}
              <div className="panel">

                <div className="panel-head">

                  <div>
                    <h3>
                      AI Face-Match —
                      top pending
                      suggestions
                    </h3>

                    <p>
                      Queued for human review
                      before any action is taken
                    </p>
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setSection(
                        "facematch"
                      )
                    }
                  >
                    Open review queue{" "}
                    <i
                      className="fa-solid fa-arrow-right"
                      aria-hidden="true"
                    />
                  </button>

                </div>


                <div>

                  {faceMatches
                    .filter(
                      (m) =>
                        m.status ===
                        "pending"
                    )
                    .slice(0, 2)
                    .map((m) => (
                      <MatchCard
                        key={m.id}
                        m={m}
                        found={m._found}
                        matchedCase={
                          m._case
                        }
                        onConfirm={(id) =>
                          reviewMatch(
                            id,
                            "confirmed"
                          )
                        }
                        onReject={(id) =>
                          reviewMatch(
                            id,
                            "rejected"
                          )
                        }
                      />
                    ))}

                  {faceMatches.filter(
                    (m) =>
                      m.status ===
                      "pending"
                  ).length === 0 && (
                    <div className="empty-state">
                      No pending matches.
                    </div>
                  )}

                </div>

              </div>

            </>
          )}


          {/* MISSING CASES */}
          {section === "missing" && (
            <div className="panel">

              <div className="filter-bar">

                <select
                  value={mCity}
                  onChange={(e) =>
                    setMCity(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    All cities
                  </option>

                  {cities.map((c) => (
                    <option key={c}>
                      {c}
                    </option>
                  ))}
                </select>


                <select
                  value={mStatus}
                  onChange={(e) =>
                    setMStatus(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    All statuses
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="investigating">
                    Investigating
                  </option>

                  <option value="tip">
                    Tip Received
                  </option>

                  <option value="found">
                    Found
                  </option>
                </select>


                <input
                  placeholder="Search name or case ID…"
                  value={mSearch}
                  onChange={(e) =>
                    setMSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="tbl-wrap">

                <table className="data">

                  <thead>
                    <tr>
                      <th>Case</th>
                      <th>Age / Gender</th>
                      <th>City</th>
                      <th>Last seen</th>
                      <th>FIR</th>
                      <th>Tips</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>


                  <tbody>

                    {missingRows.map(
                      (c) => (
                        <tr key={c.id}>

                          <td
                            style={{
                              cursor:
                                "pointer",
                            }}
                            onClick={() =>
                              setModalCaseId(
                                c.id
                              )
                            }
                          >

                            <div className="cell-person">

                              <img
                                src={c.photo}
                                alt={c.name}
                              />

                              <div>

                                <div className="nm">
                                  {c.name}
                                </div>

                                <div className="sub mono">
                                  {c.id}
                                </div>

                              </div>

                            </div>

                          </td>


                          <td>
                            {c.age} ·{" "}
                            {c.gender}
                          </td>

                          <td>
                            {c.city}
                          </td>

                          <td>
                            {fmtAdmin(
                              c.lastSeen
                            )}
                          </td>

                          <td
                            className="mono"
                            style={{
                              fontSize: 12,
                            }}
                          >
                            {c.fir}
                          </td>

                          <td>
                            {Array.isArray(
                              c.tips
                            )
                              ? c.tips.length
                              : 0}
                          </td>


                          <td>
                           {(isAdmin || isInvestigator || isPolice) ? (
                           <select 
                         value={c.status}
                         onChange={(e) => 
                          updateCaseStatus(
                           c.id,
                          e.target.value
                            )
                           }
                          style={{
                             border: "1.5px solid var(--border)",
                            borderRadius: 7,
                          padding: "4px 8px",
                            fontSize: 12,
                             }}
                           >
                          {[
                            "active",
                           "investigating",
                             "tip",
                              "found",
                            ].map((s) => (
                          <option key={s} value={s}>
                            {statusLabel(s)}
                            </option>
                             ))}
                           </select>
                          ) : (
                           <StatusBadge status={c.status} />
                           )}

                          </td>


                          <td className="row-actions">

                            {c.status ===
                              "pending" && (
                              <button
                                className="icon-btn"
                                title="Approve case"
                                onClick={() =>
                                  updateCaseStatus(
                                    c.id,
                                    "active"
                                  )
                                }
                              >
                                <i
                                  className="fa-solid fa-check"
                                  aria-hidden="true"
                                />
                              </button>
                            )}


                            <button
                              className="icon-btn"
                              title="View details"
                              onClick={() => {
                                console.log(
                                  "Opening case:",
                                  c
                                );

                                setModalCaseId(
                                  c.id
                                );
                              }}
                            >
                              <i
                                className="fa-solid fa-arrow-right"
                                aria-hidden="true"
                              />
                            </button>

                          </td>

                        </tr>
                      )
                    )}


                    {missingRows.length ===
                      0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="empty-state">
                            No cases match these filters.
                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>


              <div className="pagination">

                <span>
                  Showing{" "}
                  {missingRows.length}{" "}
                  of {cases.length} cases
                </span>

              </div>

            </div>
          )}


          {/* FOUND REPORTS */}
          {section === "found" && (
            <div className="panel">

              <div className="tbl-wrap">

                <table className="data">

                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>
                        Approx age / Gender
                      </th>
                      <th>Found at</th>
                      <th>Date</th>
                      <th>Reported by</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>


                  <tbody>

                    {adminFounds.map(
                      (f) => (
                        <tr key={f.id}>

                          <td
                            style={{
                              cursor:
                                "pointer",
                            }}
                            onClick={() =>
                              setModalFoundId(
                                f.id
                              )
                            }
                          >

                            <div className="cell-person">

                              <img
                                src={f.photo}
                                alt={f.name}
                              />

                              <div>

                                <div className="nm">
                                  {f.name}
                                </div>

                                <div className="sub mono">
                                  {f.id}
                                </div>

                              </div>

                            </div>

                          </td>


                          <td>
                            {f.currentAge ??
                              "—"}{" "}
                            · {f.gender}
                          </td>

                          <td>
                            {f.foundLocation}
                          </td>

                          <td>
                            {fmtAdmin(
                              f.foundDate
                            )}
                          </td>

                          <td>
                            {f.reportedBy}
                          </td>

                          <td>
                            <StatusBadge
                              status={
                                f.status
                              }
                            />
                          </td>


                          <td className="row-actions">

                           {f.status === "pending" && (isAdmin || isInvestigator) &&(
                              <button
                                className="icon-btn"
                                title="Approve report"
                                onClick={() =>
                                  handleApproveFound(
                                    f.id
                                  )
                                }
                              >
                                <i
                                  className="fa-solid fa-check"
                                  aria-hidden="true"
                                />
                              </button>
                            )}


                           {(isAdmin || isInvestigator) && (
                               <button className="icon-btn"
                                  title="Run AI face match"
                                   onClick={() => 
                             sendFaceMatch(f.id)
                              }
                                 >
                               <i 
                              className="fa-solid fa-camera"
                                 aria-hidden="true"
                                />
                                   </button>
                                 )}


                            {user?.role === "admin" && (
                            <button
                             className="icon-btn"
                              title="Delete report"
                             onClick={() => handleDeleteFound(f.id)}
                             >
                             <i
                             className="fa-solid fa-trash"
                              aria-hidden="true"
                             />
                             </button>
                              )}


                            <button
                              className="icon-btn"
                              title="View"
                              onClick={() =>
                                setModalFoundId(
                                  f.id
                                )
                              }
                            >
                              <i
                                className="fa-solid fa-arrow-right"
                                aria-hidden="true"
                              />
                            </button>

                          </td>

                        </tr>
                      )
                    )}


                    {adminFounds.length ===
                      0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">
                            No found reports yet.
                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}


          {/* TIPS */}
          {section === "tips" && (
            <div className="panel">

              <div className="filter-bar">

                <select
                  value={tStatus}
                  onChange={(e) =>
                    setTStatus(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    All tips
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="approved">
                    Approved
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>

              </div>


              <div>

                {tipsLoading && (
                  <div className="empty-state">
                    Loading tips…
                  </div>
                )}


                {!tipsLoading &&
                  tipRows.map((tp) => {
                    const c =
                      caseById(
                        tp.caseId
                      );

                    return (
                      <div
                        key={tp.id}
                        className="match-card"
                        style={{
                          gridTemplateColumns:
                            "1fr auto auto",
                        }}
                      >

                        <div className="match-info">

                          <h4>
                            {tp.name} —{" "}
                            <span
                              className="mono"
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              re: {tp.caseId} (
                              {tp.caseName ||
                                (c
                                  ? c.name
                                  : "—")}
                              )
                            </span>
                          </h4>

                          <p
                            className="meta"
                            style={{
                              margin:
                                "4px 0",
                            }}
                          >
                            {tp.msg}
                          </p>

                          <div className="meta">
                            {tp.location} ·{" "}
                            {fmtAdmin(
                              tp.date
                            )}
                          </div>

                        </div>


                        <div>
                          <StatusBadge
                            status={
                              tp.status
                            }
                          />
                        </div>


                        <div
                          className="match-actions"
                          style={{
                            display:
                              "flex",
                            gap: 6,
                          }}
                        >

                          {tp.status ===
                          "pending" ? (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                approveTip(
                                  tp.id
                                )
                              }
                            >
                              <i
                                className="fa-solid fa-check"
                                aria-hidden="true"
                              />{" "}
                              Approve
                            </button>
                          ) : (
                            <span className="meta">
                              {tp.status}
                            </span>
                          )}

                          {user?.role === "admin" && (
                          <button
                            className="icon-btn"
                            title="Delete tip"
                            onClick={() =>
                              handleDeleteTip(
                                tp.id
                              )
                            }
                          >
                            <i
                              className="fa-solid fa-trash"
                              aria-hidden="true"
                            />
                          </button>)}

                        </div>

                      </div>
                    );
                  })}


                {!tipsLoading &&
                  tipRows.length ===
                    0 && (
                    <div className="empty-state">

                      <div className="ic">
                        <i
                          className="fa-solid fa-lightbulb"
                          aria-hidden="true"
                        />
                      </div>

                      No tips match this filter.

                    </div>
                  )}

              </div>

            </div>
          )}


          {/* FACE MATCH */}
          {section === "facematch" && (
            <div className="panel">

              <div
                className="filter-bar"
                style={{
                  justifyContent:
                    "space-between",
                }}
              >

                <select
                  value={fmStatus}
                  onChange={(e) =>
                    setFmStatus(
                      e.target.value
                    )
                  }
                >
                  <option value="pending">
                    Pending review
                  </option>

                  <option value="confirmed">
                    Confirmed
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>

                  <option value="">
                    All
                  </option>
                </select>


                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                  }}
                >

                  {engineOnline !==
                    null && (
                    <span
                      className="meta"
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 6,
                      }}
                    >

                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius:
                            "50%",
                          background:
                            engineOnline
                              ? "#059669"
                              : "#DC2626",
                          display:
                            "inline-block",
                        }}
                      />

                      AI engine{" "}
                      {engineOnline
                        ? "online"
                        : "offline"}

                    </span>
                  )}


                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={
                      handleRunAllMatches
                    }
                    disabled={
                      fmLoading
                    }
                  >
                    <i
                      className="fa-solid fa-bolt"
                      aria-hidden="true"
                    />{" "}
                    Run AI Scan on All
                  </button>


                  <button
                    className="btn btn-outline btn-sm"
                    onClick={
                      loadFaceMatches
                    }
                    disabled={
                      fmLoading
                    }
                  >
                    <i
                      className="fa-solid fa-rotate"
                      aria-hidden="true"
                    />{" "}
                    {fmLoading
                      ? "Refreshing…"
                      : "Refresh"}
                  </button>

                </div>

              </div>


              <div>

                {fmError && (
                  <div className="empty-state">
                    {fmError}
                  </div>
                )}


                {!fmError &&
                  fmLoading && (
                    <div className="empty-state">
                      Loading face matches…
                    </div>
                  )}


                {!fmError &&
                  !fmLoading &&
                  matchRows.map((m) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      found={m._found}
                      matchedCase={
                        m._case
                      }
                      onConfirm={(id) =>
                        reviewMatch(
                          id,
                          "confirmed"
                        )
                      }
                      onReject={(id) =>
                        reviewMatch(
                          id,
                          "rejected"
                        )
                      }
                    />
                  ))}


                {!fmError &&
                  !fmLoading &&
                  matchRows.length ===
                    0 && (
                    <div className="empty-state">

                      <div className="ic">
                        <i
                          className="fa-solid fa-camera"
                          aria-hidden="true"
                        />
                      </div>

                      No matches in this view.

                    </div>
                  )}

              </div>

            </div>
          )}


          {/* USERS */}
          {section === "users" && (
            <div className="panel">

              <div className="filter-bar">

                <select
                  value={uRole}
                  onChange={(e) =>
                    setURole(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    All roles
                  </option>

                  <option value="admin">
                    Administrator
                  </option>

                  <option value="investigator">
                    Investigator
                  </option>

                  <option value="police">
                    Police Liaison
                  </option>

                  <option value="dpo">
                    Data Protection Officer
                  </option>

                  <option value="reporter">
                    Reporter
                  </option>

                  <option value="tipster">
                    Tipster
                  </option>

                  <option value="ngo">
                    NGO Partner
                  </option>
                </select>


                <input
                  placeholder="Search name or email…"
                  value={uSearch}
                  onChange={(e) =>
                    setUSearch(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="tbl-wrap">

                <table className="data">

                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>


                  <tbody>

                    {usersLoading && (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">
                            Loading users…
                          </div>
                        </td>
                      </tr>
                    )}


                    {!usersLoading &&
                      userRows.map((u) => (
                        <tr key={u.id}>

                          <td>

                            <div className="cell-person">

                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius:
                                    "50%",
                                  background:
                                    "#FFF7ED",
                                  color:
                                    "var(--emergency)",
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {u.name.charAt(
                                  0
                                )}
                              </div>

                              <div className="nm">
                                {u.name}
                              </div>

                            </div>

                          </td>


                          <td
                            style={{
                              fontSize:
                                12.5,
                              color:
                                "var(--text-supporting)",
                            }}
                          >
                            {u.email}
                          </td>


                          <td>
                            <span className="role-badge">
                              {roleLabel(
                                u.role
                              )}
                            </span>
                          </td>


                          <td>
                            {fmtAdmin(
                              u.joined
                            )}
                          </td>


                          <td>
                            {u.status ===
                            "active" ? (
                              <span className="badge badge-found">
                                Active
                              </span>
                            ) : (
                              <span className="badge badge-rejected">
                                Suspended
                              </span>
                            )}
                          </td>


                          <td
                            className="row-actions"
                            style={{
                              position:
                                "relative",
                            }}
                          >

                            {/* SUSPEND / REACTIVATE */}
                            <button
                              className="icon-btn"
                              title={
                                u.status ===
                                "active"
                                  ? "Suspend"
                                  : "Reactivate"
                              }
                              onClick={() =>
                                toggleUserStatus(
                                  u.id
                                )
                              }
                            >
                              <i
                                className={
                                  u.status ===
                                  "active"
                                    ? "fa-solid fa-pause"
                                    : "fa-solid fa-play"
                                }
                                aria-hidden="true"
                              />
                            </button>


                            {/* ROLE */}
                            <button
                              className="icon-btn"
                              title="Assign role"
                              onClick={() =>
                                setRoleMenuFor(
                                  roleMenuFor ===
                                    u.id
                                    ? null
                                    : u.id
                                )
                              }
                            >
                              <i
                                className="fa-solid fa-user-gear"
                                aria-hidden="true"
                              />
                            </button>


                            {/* DELETE */}
                            <button
                              className="icon-btn"
                              title="Delete user"
                              onClick={() =>
                                deleteUser(
                                  u.id
                                )
                              }
                            >
                              <i
                                className="fa-solid fa-trash"
                                aria-hidden="true"
                              />
                            </button>


                            {/* ROLE MENU */}
                            {roleMenuFor ===
                              u.id && (
                              <div
                                style={{
                                  position:
                                    "absolute",
                                  right: 0,
                                  top:
                                    "100%",
                                  zIndex: 10,
                                  background:
                                    "#fff",
                                  border:
                                    "1px solid var(--border)",
                                  borderRadius: 8,
                                  boxShadow:
                                    "var(--shadow-md)",
                                  padding: 6,
                                  minWidth:
                                    170,
                                }}
                              >

                                {ROLES.map(
                                  (r) => (
                                    <div
                                      key={r}
                                      onClick={() =>
                                        assignRole(
                                          u.id,
                                          r
                                        )
                                      }
                                      style={{
                                        padding:
                                          "7px 10px",
                                        fontSize:
                                          12.5,
                                        borderRadius:
                                          6,
                                        cursor:
                                          "pointer",
                                        fontWeight:
                                          r ===
                                          u.role
                                            ? 700
                                            : 400,
                                        background:
                                          r ===
                                          u.role
                                            ? "var(--bg-subtle)"
                                            : "transparent",
                                      }}
                                    >
                                      {roleLabel(
                                        r
                                      )}
                                    </div>
                                  )
                                )}

                              </div>
                            )}

                          </td>

                        </tr>
                      ))}


                    {!usersLoading &&
                      userRows.length ===
                        0 && (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty-state">
                              No users match this filter.
                            </div>
                          </td>
                        </tr>
                      )}

                  </tbody>

                </table>

              </div>

            </div>
          )}


          {/* CONTACTS */}
          {section === "contacts" && (
            <ContactMessages
              logAudit={logAudit}
              toast={toast}
              fmtAdmin={fmtAdmin}
            />
          )}


          {/* AUDIT */}
          {section === "audit" && (
            <div className="panel">

              <div className="panel-head">

                <div>
                  <h3>
                    Full Audit Trail
                  </h3>

                  <p>
                    Every access to case status,
                    CNIC and biometric data is recorded
                  </p>
                </div>


                <button
                  className="btn btn-outline btn-sm"
                  onClick={
                    handleExportAudit
                  }
                >
                  <i
                    className="fa-solid fa-file-export"
                    aria-hidden="true"
                  />{" "}
                  Export CSV
                </button>

              </div>


              <div>

                {auditLog.map(
                  (a, i) => (
                    <div
                      key={
                        a.id || i
                      }
                      className="audit-item"
                    >

                      <div
                        className="dot"
                        style={{
                          background:
                            a.kind ===
                            "warn"
                              ? "#D97706"
                              : a.kind ===
                                "success"
                              ? "#059669"
                              : "var(--emergency)",
                        }}
                      />


                      <div className="txt">

                        <div className="a1">
                          <b>
                            {a.actor}
                          </b>{" "}
                          — {a.detail}
                        </div>

                        <div className="a2 mono">
                          {a.action}
                        </div>

                      </div>


                      <div className="ts">
                        {a.ts}
                      </div>


                      {user?.role ===
                        "admin" && (
                        <button
                          className="icon-btn"
                          title="Delete audit log"
                          onClick={() =>
                            handleDeleteAudit(
                              a.id
                            )
                          }
                        >
                          <i
                            className="fa-solid fa-trash"
                            aria-hidden="true"
                          />
                        </button>
                      )}

                    </div>
                  )
                )}

              </div>

            </div>
          )}

        </div>

      </main>


      {/* CASE MODAL */}
     <CaseDetailModal
  c={
    modalCaseId
      ? caseById(modalCaseId)
      : null
  }
  onClose={() => setModalCaseId(null)}
  onViewRestricted={viewRestricted}
  onDelete={handleDeleteCase}
  isAdmin={isAdmin}
/>


      {/* FOUND MODAL */}
     <FoundDetailModal
  f={
    modalFoundId
      ? foundById(modalFoundId)
      : null
  }
  onClose={() => setModalFoundId(null)}
  onViewRestricted={viewRestricted}
  onApprove={handleApproveFound}
  onDelete={handleDeleteFound}
  onSendFaceMatch={sendFaceMatch}
  isAdmin={isAdmin}
/>

      <Toast
        message={toastMsg}
      />

    </div>
  );
}