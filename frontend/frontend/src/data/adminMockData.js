export function statusLabel(s) {
  return {
    active: "Active",
    investigating: "Investigating",
    tip: "Tip Received",
    found: "Found",
    unmatched: "Unmatched",
    matched: "Matched",
    pending: "Pending",
    reviewed: "Reviewed",
    confirmed: "Confirmed",
    rejected: "Rejected",
    suspended: "Suspended",
  }[s] || s;
}

export function roleLabel(r) {
  return {
    admin: "Administrator",
    investigator: "Investigator",
    police: "Police Liaison",
    dpo: "Data Protection Officer",
    reporter: "Reporter",
    tipster: "Tipster",
    ngo: "NGO Partner",
  }[r] || r;
}

export function fmtAdmin(d) {
  const dt = new Date(d);

  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function nowStr() {
  const d = new Date();

  return d.toISOString().slice(0, 16).replace("T", " ");
}