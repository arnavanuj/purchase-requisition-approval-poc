import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";

export default function RequesterDashboard({ user, onLogout, setToast }) {
  const navigate = useNavigate();
  const [purchaseRequisitions, setPurchaseRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseRequisitions();
      setPurchaseRequisitions(data);
    } catch (error) {
      setToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const toastMessage = sessionStorage.getItem("toastMessage");
    if (toastMessage) {
      setToast(toastMessage);
      sessionStorage.removeItem("toastMessage");
    }
  }, [setToast]);

  useEffect(() => {
    const handleWindowClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const toggleMenu = (event, prId) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenMenuId((current) => (current === prId ? null : prId));
  };

  const handleView = (prId) => {
    setOpenMenuId(null);
    navigate(`/purchase-requisitions/${prId}`);
  };

  const handleEdit = (prId) => {
    setOpenMenuId(null);
    navigate(`/purchase-requisitions/${prId}/edit`);
  };

  const handleCopy = async (prId) => {
    setOpenMenuId(null);
    setActioningId(prId);
    try {
      const response = await api.copyPurchaseRequisition(prId);
      setToast(response.toast_message);
      await loadData();
    } catch (error) {
      setToast(error.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (prId) => {
    setOpenMenuId(null);
    if (!window.confirm("Are you sure you want to delete this PR?")) {
      return;
    }

    setActioningId(prId);
    try {
      const response = await api.deletePurchaseRequisition(prId);
      setToast(response.toast_message);
      await loadData();
    } catch (error) {
      setToast(error.message);
    } finally {
      setActioningId(null);
    }
  };

  const isFullyApproved = (status) => status === "Fully Approved";

  return (
    <div className="page-shell">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <div className="page-header">
          <div>
            <h2>Requester Dashboard</h2>
            <p>Track your purchase requisitions and their approval progress.</p>
          </div>
          <Link className="primary-link-button" to="/create-pr">
            Create PR
          </Link>
        </div>

        <div className="card">
          <h3>Your PRs</h3>
          {loading ? (
            <p>Loading purchase requisitions...</p>
          ) : purchaseRequisitions.length === 0 ? (
            <p>No PRs found yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PR Number</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Item</th>
                    <th>Estimated Cost</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequisitions.map((pr) => (
                    <tr key={pr.id}>
                      <td>
                        <div className="pr-number-cell">
                          <div className="pr-action-menu">
                            <button
                              aria-expanded={openMenuId === pr.id}
                              aria-haspopup="menu"
                              className="icon-button"
                              disabled={actioningId === pr.id}
                              onClick={(event) => toggleMenu(event, pr.id)}
                              onContextMenu={(event) => toggleMenu(event, pr.id)}
                              type="button"
                            >
                              &#8942;
                            </button>
                            {openMenuId === pr.id ? (
                              <div
                                className="dropdown-menu"
                                onClick={(event) => event.stopPropagation()}
                                role="menu"
                              >
                                <button className="dropdown-menu__item" onClick={() => handleView(pr.id)} type="button">
                                  View PR
                                </button>
                                {!isFullyApproved(pr.status) ? (
                                  <button className="dropdown-menu__item" onClick={() => handleEdit(pr.id)} type="button">
                                    Edit PR
                                  </button>
                                ) : null}
                                <button className="dropdown-menu__item" onClick={() => handleCopy(pr.id)} type="button">
                                  Copy Create PR
                                </button>
                                {!isFullyApproved(pr.status) ? (
                                  <button
                                    className="dropdown-menu__item dropdown-menu__item--danger"
                                    onClick={() => handleDelete(pr.id)}
                                    type="button"
                                  >
                                    Delete PR
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <span>{pr.pr_number}</span>
                        </div>
                      </td>
                      <td>{pr.title}</td>
                      <td>{pr.department}</td>
                      <td>{pr.item_name}</td>
                      <td>${Number(pr.estimated_cost).toFixed(2)}</td>
                      <td>{pr.priority}</td>
                      <td><StatusBadge status={pr.status} /></td>
                      <td>{new Date(pr.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link className="inline-link" to={`/purchase-requisitions/${pr.id}`}>
                          View details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
