import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="wrap" style={{ padding: "100px 0", textAlign: "center" }}>
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>Home</Link>
    </section>
  );
}
