import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import SplashScreen from "./components/SplashScreen";

import Home from "./pages/Home";
import MissingPersonsList from "./pages/MissingPersonsList";
import MissingPersonDetail from "./pages/MissingPersonDetail";
import PersonFound from "./pages/PersonFound";
import PersonFoundDetail from "./pages/PersonFoundDetail";
import ReportMissing from "./pages/ReportMissing";
import ReportFound from "./pages/ReportFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Guide from "./pages/Guide";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ChatWidget from "./components/ChatWidget";


import AdminDashboard from "./pages/admin/AdminDashboard";

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <ChatWidget/>
    </>
  );
}

function SplashGate({ children }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // 3 second splash

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <SplashGate>
          <Routes>
            
            <Route
              path="/admin/dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />

            {/* ---- Public site ---- */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/missing-persons" element={<PublicLayout><MissingPersonsList /></PublicLayout>} />
            {/* Case detail is behind RequireAuth as a hard backstop — even a
                direct URL visit without signing in bounces to /login. */}
            <Route
              path="/missing-persons/:id"
              element={
                <PublicLayout>
                  <RequireAuth>
                    <MissingPersonDetail />
                  </RequireAuth>
                </PublicLayout>
              }
            />
            {/* Person Found is fully public — no auth guard, ever. */}
            <Route path="/person-found" element={<PublicLayout><PersonFound /></PublicLayout>} />
            <Route path="/person-found/:id" element={<PublicLayout><PersonFoundDetail /></PublicLayout>} />

            <Route
              path="/report-missing"
              element={
                <PublicLayout>
                  <RequireAuth>
                    <ReportMissing />
                  </RequireAuth>
                </PublicLayout>
              }
            />
            <Route path="/report-found" element={<PublicLayout><ReportFound /></PublicLayout>} />

            <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
            <Route path="/signup" element={<PublicLayout><Signup /></PublicLayout>} />
            <Route
              path="/dashboard"
              element={
                <PublicLayout>
                  <RequireAuth>
                    <Dashboard />
                  </RequireAuth>
                </PublicLayout>
              }
            />

            <Route path="/guide" element={<PublicLayout><Guide /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />

            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </SplashGate>
       </DataProvider>
    </AuthProvider>
  );
}