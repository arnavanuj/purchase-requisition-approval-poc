import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import RequesterDashboard from "./pages/RequesterDashboard";
import CreatePR from "./pages/CreatePR";
import ApproverDashboard from "./pages/ApproverDashboard";
import PRDetails from "./pages/PRDetails";
import PurchaseOrders from "./pages/PurchaseOrders";
import Toast from "./components/Toast";

function getStoredUser() {
  const token = localStorage.getItem("token");
  const email = localStorage.getItem("email");
  const role = localStorage.getItem("role");
  if (!token || !email || !role) {
    return null;
  }
  return { token, email, role };
}

function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "requester" ? "/requester" : "/approvals"} replace />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const toastMessage = sessionStorage.getItem("toastMessage");
    if (toastMessage) {
      setToast(toastMessage);
      sessionStorage.removeItem("toastMessage");
    }
  }, []);

  const handleLogin = (loginData) => {
    localStorage.setItem("token", loginData.token);
    localStorage.setItem("email", loginData.email);
    localStorage.setItem("role", loginData.role);
    setUser(loginData);
    navigate(loginData.role === "requester" ? "/requester" : "/approvals");
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} setToast={setToast} />}
        />
        <Route
          path="/requester"
          element={
            <ProtectedRoute allowedRoles={["requester"]} user={user}>
              <RequesterDashboard user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-pr"
          element={
            <ProtectedRoute allowedRoles={["requester"]} user={user}>
              <CreatePR user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute allowedRoles={["approver1", "approver2"]} user={user}>
              <ApproverDashboard user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute allowedRoles={["requester", "approver1", "approver2"]} user={user}>
              <PurchaseOrders user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-requisitions/:id/edit"
          element={
            <ProtectedRoute allowedRoles={["requester"]} user={user}>
              <CreatePR user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-requisitions/:id"
          element={
            <ProtectedRoute allowedRoles={["requester", "approver1", "approver2"]} user={user}>
              <PRDetails user={user} onLogout={handleLogout} setToast={setToast} />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? (user.role === "requester" ? "/requester" : "/approvals") : "/login"} replace />}
        />
      </Routes>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}
