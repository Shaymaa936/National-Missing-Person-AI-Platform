import { devError, devWarn } from "../utils/logger";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { API_BASE } from "../api/apiClient";

const DataContext = createContext(null);

const API = `${API_BASE}/api`;

const FALLBACK_FOUND_PHOTO =
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=500&fit=crop";

/* =====================================================
   HELPERS
===================================================== */

function genId(prefix) {
  return `${prefix}-2026-${String(
    Math.floor(1000 + Math.random() * 8999)
  )}`;
}

function guessCity(location) {
  if (!location) return "—";

  const parts = String(location)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.length
    ? parts[parts.length - 1]
    : location;
}

/* =====================================================
   NORMALIZE MISSING PERSON
===================================================== */

function normalizeMissingPerson(person, token) {
  const caseId =
    person.caseId ||
    (person._id
      ? `MP-2026-${person._id
          .toString()
          .slice(-4)
          .toUpperCase()}`
      : person.id || genId("MP"));

  const rawStatus =
    person.status?.toLowerCase();

  return {
    ...person,

    _id: person._id,

    id: caseId,
    caseId,

    /* =========================
       BASIC INFORMATION
    ========================= */

    name:
      person.name ||
      "Unknown Person",

    age:
      person.age ?? 0,

    gender:
      person.gender ||
      "Other",

    city:
      person.city ||
      guessCity(
        person.lastSeenLocation
      ) ||
      "—",

    location:
      person.lastSeenLocation ||
      person.location ||
      person.city ||
      "—",

    lastSeen:
      person.lastSeenDate ||
      person.lastSeen ||
      null,

    desc:
      person.description ||
      person.desc ||
      "—",

    description:
      person.description ||
      person.desc ||
      "—",

    /* =========================
       ACCOUNT REPORTER
    ========================= */

    reportedBy:
      person.reportedBy ||
      null,

    reportedByEmail:
      typeof person.reportedBy ===
      "object"
        ? person.reportedBy?.email ||
          null
        : person.reportedByEmail ||
          null,

    /* =========================
       CONTACT PERSON
       THIS IS FROM THE FORM
    ========================= */

    contactName:
      person.contactName ||
      "—",

    contactPhone:
      person.contactPhone ||
      person.contactNumber ||
      person.phone ||
      "—",

    contactEmail:
      person.contactEmail ||
      person.email ||
      "—",

    /* =========================
       RESTRICTED INFORMATION
    ========================= */

    cnic:
      person.cnic ||
      person.CNIC ||
      person.nationalId ||
      "—",

    fir:
      person.fir ||
      person.firNo ||
      person.firNumber ||
      "—",

    /* =========================
       IMAGE
    ========================= */

    photo: person.image
      ? person.image.startsWith("http")
        ? person.image
        : `${API_BASE}${person.image}${
            token
              ? `?token=${token}`
              : ""
          }`
      : person.photo
      ? person.photo.startsWith("http")
        ? person.photo
        : `${API_BASE}${person.photo}${
            token
              ? `?token=${token}`
              : ""
          }`
      : null,

    /* =========================
       STATUS
    ========================= */

    status:
      rawStatus === "missing"
        ? "active"
        : rawStatus || "active",

    /* =========================
       TIPS
    ========================= */

    tips:
      Array.isArray(person.tips)
        ? person.tips
        : [],

    /* =========================
       TIMELINE
    ========================= */

    timeline:
      Array.isArray(person.timeline)
        ? person.timeline
        : [],
  };
}

/* =====================================================
   NORMALIZE FOUND REPORT
===================================================== */

function normalizeFoundReport(
  report,
  token
) {
  const caseId =
    report.caseId ||
    (report._id
      ? `FP-2026-${report._id
          .toString()
          .slice(-4)
          .toUpperCase()}`
      : report.id || genId("FP"));

  return {
    ...report,

    _id: report._id,

    id: caseId,
    caseId,

    name:
      report.name ||
      report.fullName ||
      "Unknown Person",

     currentAge:
    report.currentAge ?? null,

    ageWhenLost:
    report.ageWhenLost ?? null,

    gender:
      report.gender ||
      "other",

    foundLocation:
      report.location ||
      report.foundLocation ||
      "—",

    foundDate:
      report.createdAt
        ? report.createdAt.slice(0, 10)
        : report.foundDate ||
          "—",

    shelterLocation:
      report.location ||
      report.foundLocation ||
      "—",

    status:
      report.status?.toLowerCase() ||
      "pending",

    longLost:
      report.category ===
      "longLost",

    photo: report.image
      ? report.image.startsWith("http")
        ? report.image
        : `${API_BASE}${report.image}${
            token
              ? `?token=${token}`
              : ""
          }`
      : report.photo ||
        FALLBACK_FOUND_PHOTO,

    desc:
      report.description ||
      report.desc ||
      "—",

    marks:
      report.marks ||
      "—",

    reportedBy:
      typeof report.reportedBy ===
      "object"
        ? report.reportedBy?.name ||
          report.reportedBy?.email ||
          "Anonymous"
        : report.reportedBy ||
          report.reporter ||
          "Anonymous",

    reportedByEmail:
      typeof report.reportedBy ===
      "object"
        ? report.reportedBy?.email ||
          null
        : report.reportedByEmail ||
          report.email ||
          null,

    contactPhone:
      report.contact ||
      report.contactPhone ||
      report.phone ||
      "—",
  };
}

/* =====================================================
   PROVIDER
===================================================== */

export function DataProvider({
  children,
}) {
  const { user } = useAuth();
  /* =====================================================
     MISSING CASES
  ===================================================== */

  const [cases, setCases] =
    useState([]);

  const loadCases = useCallback(
    async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        const response =
          await fetch(
            `${API}/person`,
            {
              headers: token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {},
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load missing persons"
          );
        }

        const data =
          await response.json();

        const backendCases =
          Array.isArray(data)
            ? data
            : data.persons ||
              data.cases ||
              [];

        const normalizedCases =
          backendCases.map(
            (person) =>
              normalizeMissingPerson(
                person,
                token
              )
          );

        setCases(
          normalizedCases
        );
      } catch (error) {
        devError(
          "Failed to load missing persons:",
          error
        );

        setCases([]);
      }
    },
    []
  );

  useEffect(() => {
    loadCases();
  }, [loadCases, user]);

  /* =====================================================
     PUBLIC FOUND REPORTS
  ===================================================== */

  const [founds, setFounds] =
    useState([]);

  const loadPublicFoundReports =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            `${API}/report/public`
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load public found reports"
          );
        }

        const data =
          await response.json();

        const backendFounds =
          Array.isArray(data)
            ? data
            : [];

        const normalizedFounds =
          backendFounds.map(
            (report) =>
              normalizeFoundReport(
                report,
                null
              )
          );

        setFounds(
          normalizedFounds
        );
      } catch (error) {
        devError(
          "Failed to load public found reports:",
          error
        );

        setFounds([]);
      }
    }, []);

  useEffect(() => {
    loadPublicFoundReports();
  }, [
    loadPublicFoundReports,
  ]);

  /* =====================================================
     ADMIN FOUND REPORTS
  ===================================================== */

  const [
    adminFounds,
    setAdminFounds,
  ] = useState([]);

  const loadAdminFoundReports =
    useCallback(async () => {
      try {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          setAdminFounds([]);
          return;
        }

        const response =
          await fetch(
            `${API}/report`,
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        
        if (!response.ok) {
       if (response.status === 401) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  devWarn("Token expired. Logged out.");
  return;
  }

  throw new Error(
    data.message || "Failed to load admin reports"
  );
}

        const backendReports =
          Array.isArray(data)
            ? data
            : [];

        const normalizedReports =
          backendReports.map(
            (report) =>
              normalizeFoundReport(
                report,
                token
              )
          );

        setAdminFounds(
          normalizedReports
        );
      } catch (error) {
        devError(
          "Failed to load admin found reports:",
          error
        );

        setAdminFounds([]);
      }
    }, []);

 const STAFF_ROLES = [
  "admin",
  "investigator",
  "police",
  "dpo",
  "reporter",
  "tipster",
  "ngo",
];

useEffect(() => {
  if (user && STAFF_ROLES.includes(user.role)) {
    loadAdminFoundReports();
  } else {
    setAdminFounds([]);
  }
}, [
  loadAdminFoundReports,
  user,
]);

  /* =====================================================
     ADD MISSING CASE
  ===================================================== */

  const addMissingCase =
    useCallback(
      async (
        data,
        reporter
      ) => {
        try {
          const token =
            localStorage.getItem(
              "token"
            );

          const formData =
            new FormData();

          /* =========================
             BASIC INFORMATION
          ========================= */

          formData.append(
            "name",
            data.fullName ||
              data.name ||
              "Unknown Person"
          );

          if (
            data.age !==
              undefined &&
            data.age !== ""
          ) {
            formData.append(
              "age",
              Number(data.age)
            );
          }

        if (data.gender) {
  const genderMap = {
    male: "Male",
    female: "Female",
    other: "Other",
    Male: "Male",
    Female: "Female",
    Other: "Other",
  };

  const normalizedGender =
    genderMap[data.gender] ||
    "Other";

  formData.append(
    "gender",
    normalizedGender
  );
}

          formData.append(
            "lastSeenLocation",
            data.lastLocation ||
              data.location ||
              ""
          );

          if (
            data.lastDateTime
          ) {
            formData.append(
              "lastSeenDate",
              data.lastDateTime
            );
          }

          /* =========================
             DESCRIPTION
          ========================= */

          const description = [
            data.physical ||
              data.description ||
              "",

            data.marks
              ? `Marks: ${data.marks}`
              : "",

            data.clothing
              ? `Clothing: ${data.clothing}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ");

          formData.append(
            "description",
            description
          );

          /* =========================
             CONTACT INFORMATION
          ========================= */

          formData.append(
            "contactName",
            data.contactName ||
              ""
          );

          formData.append(
            "contactPhone",
            data.phone ||
              data.contactPhone ||
              data.contactNumber ||
              ""
          );

          formData.append(
            "contactEmail",
            data.email ||
              data.contactEmail ||
              ""
          );

          /* =========================
             IDENTIFICATION
          ========================= */

          formData.append(
            "cnic",
            data.cnic ||
              data.CNIC ||
              data.nationalId ||
              ""
          );

          formData.append(
            "fir",
            data.firNo ||
              data.fir ||
              data.firNumber ||
              ""
          );

          /* =========================
             PHOTO
          ========================= */

          if (
            data.photo instanceof
              File &&
            data.photo.size > 0
          ) {
            formData.append(
              "photo",
              data.photo
            );
          }

          /* =========================
             FIR FILE
          ========================= */

          if (
            data.firFile instanceof
              File &&
            data.firFile.size > 0
          ) {
            formData.append(
              "firFile",
              data.firFile
            );
          }

          /* =========================
             BACKEND REQUEST
          ========================= */

          const response =
            await fetch(
              `${API}/person`,
              {
                method: "POST",

                headers: token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {},

                body: formData,
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Failed to submit missing person report"
            );
          }

          /* =========================
             NORMALIZE NEW CASE
          ========================= */

          const newCase =
            normalizeMissingPerson(
              {
                ...result,

                contactName:
                  result.contactName ||
                  data.contactName ||
                  "—",

                cnic:
                  result.cnic ||
                  data.cnic ||
                  data.CNIC ||
                  "—",

                contactPhone:
                  result.contactPhone ||
                  data.phone ||
                  data.contactPhone ||
                  "—",

                contactEmail:
                  result.contactEmail ||
                  data.email ||
                  data.contactEmail ||
                  "—",

                fir:
                  result.fir ||
                  data.firNo ||
                  data.fir ||
                  "—",

                timeline:
                  Array.isArray(
                    result.timeline
                  )
                    ? result.timeline
                    : [
                        {
                          date:
                            result.createdAt ||
                            new Date().toISOString(),

                          title:
                            "Missing report filed",

                          desc:
                            "Missing person report submitted through TraceAI.",
                        },
                      ],
              },
              token
            );

          setCases(
            (prev) => [
              newCase,
              ...prev,
            ]
          );

          return newCase;
        } catch (error) {
          devError(
            "Failed to submit missing person:",
            error
          );

          throw error;
        }
      },
      []
    );

  /* =====================================================
     ADD FOUND REPORT
  ===================================================== */

  const addFoundReport =
    useCallback(
      async (
        data,
        reporter
      ) => {
        try {
          const formData =
            new FormData();

          formData.append(
               "name",
                 data.name || "Unknown Person"
              );
              formData.append(
              "contactName",
               data.contactName || ""
              );

          formData.append(
            "contact",
            data.phone ||
              data.contact ||
              ""
          );

          formData.append(
            "location",
            data.location ||
              ""
          );

          formData.append(
            "description",
            data.physical ||
              data.description ||
              ""
          );

               if (data.currentAge) {
              formData.append(
               "currentAge",
               Number(data.currentAge)
               );
               }

              if (data.ageWhenLost) {
              formData.append(
              "ageWhenLost",
              Number(data.ageWhenLost)
                );
             }

          if (data.gender) {
            formData.append(
              "gender",
              data.gender
            );
          }

          if (data.category) {
            formData.append(
              "category",
              data.category
            );
          }

          if (data.marks) {
            formData.append(
              "marks",
              data.marks
            );
          }

          if (
            data.photo instanceof
              File &&
            data.photo.size > 0
          ) {
            formData.append(
              "photo",
              data.photo
            );
          }

          const token =
            localStorage.getItem(
              "token"
            );

          const response =
            await fetch(
              `${API}/report`,
              {
                method: "POST",

                headers: token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {},

                body: formData,
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Failed to submit report"
            );
          }

          const newFound =
            normalizeFoundReport(
              {
                ...result,

                reportedBy:
                  result.reportedBy ||
                  reporter?.name ||
                  data.contactName ||
                  "Anonymous",

                reportedByEmail:
                  result.reportedBy?.email ||
                  reporter?.email ||
                  null,

                contactPhone:
                  result.contact ||
                  data.phone ||
                  "—",
              },
              token
            );

          setAdminFounds(
            (prev) => [
              newFound,
              ...prev,
            ]
          );

          if (
            newFound.status ===
            "verified"
          ) {
            setFounds(
              (prev) => [
                newFound,
                ...prev,
              ]
            );
          }

          return newFound;
        } catch (error) {
          devError(
            "Failed to submit found report:",
            error
          );

          throw error;
        }
      },
      []
    );

  /* =====================================================
     UPDATE MISSING CASE STATUS
  ===================================================== */

  const updateCaseStatus =
    useCallback(
      async (
        id,
        status
      ) => {
        const target =
          cases.find(
            (c) =>
              c.id === id ||
              c._id === id ||
              c.caseId === id
          );

        if (!target) {
          throw new Error(
            "Case not found"
          );
        }

        let backendStatus =
          "Missing";

        if (
          status === "found"
        ) {
          backendStatus =
            "Found";
        }

        if (
          status === "closed"
        ) {
          backendStatus =
            "Closed";
        }

        const backendId =
          target._id || id;

        try {
          const token =
            localStorage.getItem(
              "token"
            );

          const response =
            await fetch(
              `${API}/person/${backendId}`,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                body: JSON.stringify({
                  status:
                    backendStatus,
                }),
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Failed to update case status"
            );
          }

          setCases(
            (prev) =>
              prev.map((c) =>
                c.id === id ||
                c._id === id
                  ? {
                      ...c,
                      status,
                    }
                  : c
              )
          );

          return result;
        } catch (error) {
          devError(
            "Failed to update case status:",
            error
          );

          throw error;
        }
      },
      [cases]
    );

  /* =====================================================
     DELETE CASE
  ===================================================== */

  const deleteCase =
    useCallback(
      async (id) => {
        const target =
          cases.find(
            (c) =>
              c._id === id ||
              c.id === id ||
              c.caseId === id
          );

        const backendId =
          target?._id || id;

        try {
          const token =
            localStorage.getItem(
              "token"
            );

          const response =
            await fetch(
              `${API}/person/${backendId}`,
              {
                method: "DELETE",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
            const result =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              result.message ||
                "Failed to delete case"
            );
          }

          setCases(
            (prev) =>
              prev.filter(
                (c) =>
                  c._id !==
                    backendId &&
                  c.id !== id &&
                  c.caseId !== id
              )
          );
        } catch (error) {
          devError(
            "Failed to delete case:",
            error
          );

          throw error;
        }
      },
      [cases]
    );

  /* =====================================================
     APPROVE FOUND REPORT
  ===================================================== */

  const approveFound =
    useCallback(
      async (id) => {
        try {
          const target =
            adminFounds.find(
              (f) =>
                f.id === id ||
                f._id === id
            );

          const backendId =
            target?._id || id;

          const token =
            localStorage.getItem(
              "token"
            );

          const response =
            await fetch(
              `${API}/report/${backendId}`,
              {
                method: "PUT",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                body: JSON.stringify({
                  status:
                    "Verified",
                }),
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.message ||
                "Failed to approve report"
            );
          }

          setAdminFounds(
            (prev) =>
              prev.map((f) =>
                f.id === id ||
                f._id === id
                  ? {
                      ...f,
                      status:
                        "verified",
                    }
                  : f
              )
          );

          setFounds(
            (prev) => {
              const alreadyExists =
                prev.some(
                  (f) =>
                    f.id === id ||
                    f._id === id
                );

              if (
                alreadyExists
              ) {
                return prev.map(
                  (f) =>
                    f.id === id ||
                    f._id === id
                      ? {
                          ...f,
                          status:
                            "verified",
                        }
                      : f
                );
              }

              const approved =
                adminFounds.find(
                  (f) =>
                    f.id === id ||
                    f._id === id
                );

              return approved
                ? [
                    {
                      ...approved,
                      status:
                        "verified",
                    },
                    ...prev,
                  ]
                : prev;
            }
          );

          return result;
        } catch (error) {
          devError(
            "Failed to approve found report:",
            error
          );

          throw error;
        }
      },
      [adminFounds]
    );

  /* =====================================================
     DELETE FOUND REPORT
  ===================================================== */

  const deleteFound =
    useCallback(
      async (id) => {
        const target =
          adminFounds.find(
            (f) =>
              f._id === id ||
              f.id === id
          ) ||
          founds.find(
            (f) =>
              f._id === id ||
              f.id === id
          );

        if (!target?._id) {
          throw new Error(
            "Could not find this report's database ID. Refresh the page and try again."
          );
        }

        const backendId =
          target._id;

        try {
          const token =
            localStorage.getItem(
              "token"
            );

          const response =
            await fetch(
              `${API}/report/${backendId}`,
              {
                method: "DELETE",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (!response.ok) {
            const result =
              await response
                .json()
                .catch(
                  () => ({})
                );

            throw new Error(
              result.message ||
                "Failed to delete report"
            );
          }

          setAdminFounds(
            (prev) =>
              prev.filter(
                (f) =>
                  f._id !==
                    backendId &&
                  f.id !== id
              )
          );

          setFounds(
            (prev) =>
              prev.filter(
                (f) =>
                  f._id !==
                    backendId &&
                  f.id !== id
              )
          );
        } catch (error) {
          devError(
            "Failed to delete report:",
            error
          );

          throw error;
        }
      },
      [adminFounds, founds]
    );

  /* =====================================================
     CONTEXT VALUE
  ===================================================== */

  const value = {
    cases,

    founds,

    adminFounds,

    addMissingCase,

    addFoundReport,

    updateCaseStatus,

    deleteCase,

    approveFound,

    deleteFound,

    reloadCases:
      loadCases,

    reloadAdminFoundReports:
      loadAdminFoundReports,

    reloadPublicFoundReports:
      loadPublicFoundReports,

    reloadAll: () => {
      loadCases();
      loadPublicFoundReports();
      loadAdminFoundReports();
    },
  };

  return (
    <DataContext.Provider
      value={value}
    >
      {children}
    </DataContext.Provider>
  );
}

/* =====================================================
   HOOK
===================================================== */

export function useData() {
  const ctx =
    useContext(DataContext);

  if (!ctx) {
    throw new Error(
      "useData must be used within a DataProvider"
    );
  }

  return ctx;
}