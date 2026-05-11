import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div>
        <h1>Purchase Requisition POC</h1>
        <p>{user?.email}</p>
      </div>
      <div className="nav-links">
        {user?.role === "requester" ? (
          <>
            <Link className={location.pathname === "/requester" ? "active" : ""} to="/requester">
              Dashboard
            </Link>
            <Link className={location.pathname === "/create-pr" ? "active" : ""} to="/create-pr">
              Create PR
            </Link>
          </>
        ) : (
          <Link className={location.pathname === "/approvals" ? "active" : ""} to="/approvals">
            Approval Queue
          </Link>
        )}
        <button className="secondary-button" onClick={onLogout} type="button">
          Logout
        </button>
      </div>
    </nav>
  );
}
