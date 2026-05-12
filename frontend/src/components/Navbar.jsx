import { Link, useLocation } from "react-router-dom";

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  const requesterLinks = [
    { to: "/requester", label: "Dashboard" },
    { to: "/create-pr", label: "Create PR" },
    { to: "/purchase-orders", label: "Purchase Orders" },
  ];

  const approverLinks = [
    { to: "/approvals", label: "Approval Queue" },
    { to: "/purchase-orders", label: "Purchase Orders" },
  ];

  const links = user?.role === "requester" ? requesterLinks : approverLinks;

  return (
    <aside className="navbar">
      <div className="navbar__brand">
        <h1>Purchase Requisition POC</h1>
        <p>{user?.email}</p>
      </div>
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.to} className={location.pathname === link.to ? "active" : ""} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
      <button className="secondary-button navbar__logout" onClick={onLogout} type="button">
        Logout
      </button>
    </aside>
  );
}
