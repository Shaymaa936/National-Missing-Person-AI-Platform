import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const STAFF_ROLES = [
  "admin",
  "investigator",
  "police",
  "dpo",
  "reporter",
  "tipster",
  "ngo",
];

export default function RequireAdmin({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}