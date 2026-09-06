import { statusLabel } from "../../data/adminMockData";
import StatusBadge from "../StatusBadge";

export default function MatchCard({ m, found, matchedCase, onConfirm, onReject }) {
  if (!found || !matchedCase) return null;
  const color = m.similarity >= 70 ? "#059669" : m.similarity >= 50 ? "#D97706" : "#DC2626";
  return (
    <div className="match-card">
      <div className="match-photos">
        <img src={found.photo} alt={found.id} title={`${found.id} — found`} />
        <span className="vs">vs</span>
        <img src={matchedCase.photo} alt={matchedCase.name} title={`${matchedCase.id} — ${matchedCase.name}`} />
      </div>
      <div className="match-info">
        <h4>{found.id} <span style={{ color: "#94A3B8", fontWeight: 500 }}>possibly</span> {matchedCase.name}</h4>
        <div className="meta">Found: {found.foundLocation} · Case: {matchedCase.city} · <StatusBadge status={m.status} /></div>
      </div>
      <div className="match-score">
        <div className="pct">{m.similarity}%</div>
        <div className="bar"><div className="fill" style={{ width: `${m.similarity}%`, background: color }} /></div>
      </div>
      <div className="match-actions">
        {m.status === "pending" ? (
          <>
            <button className="btn btn-success btn-sm" onClick={() => onConfirm(m.id)}>Confirm</button>
            <button className="btn btn-outline btn-sm" onClick={() => onReject(m.id)}>Reject</button>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" disabled>{statusLabel(m.status)}</button>
        )}
      </div>
    </div>
  );
}
