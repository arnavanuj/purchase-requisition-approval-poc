import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../api";
import Navbar from "../components/Navbar";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";

export default function ApproverDashboard({ user, onLogout, setToast }) {
  const recordsPerPage = 10;
  const navigate = useNavigate();
  const [purchaseRequisitions, setPurchaseRequisitions] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage((page) => {
      const nextTotalPages = Math.max(1, Math.ceil(purchaseRequisitions.length / recordsPerPage));
      return Math.min(page, nextTotalPages);
    });
  }, [purchaseRequisitions.length]);

  const totalPages = Math.max(1, Math.ceil(purchaseRequisitions.length / recordsPerPage));
  const currentRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return purchaseRequisitions.slice(startIndex, startIndex + recordsPerPage);
  }, [currentPage, purchaseRequisitions]);

  const handleAction = async (prId, action) => {
    const comment = comments[prId];
    if (!comment || !comment.trim()) {
      setToast("Please add comments before approving or rejecting.");
      return;
    }

    setActioningId(prId);
    try {
      const response =
        action === "approve"
          ? await api.approvePurchaseRequisition(prId, { comments: comment })
          : await api.rejectPurchaseRequisition(prId, { comments: comment });

      sessionStorage.setItem("toastMessage", response.toast_message);
      navigate(`/purchase-requisitions/${prId}`);
    } catch (error) {
      setToast(error.message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="page-shell">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <div className="page-header">
          <div>
            <h2>{user.role === "approver1" ? "Approver 1 Queue" : "Approver 2 Queue"}</h2>
            <p>Review PRs assigned to your current approval level.</p>
          </div>
        </div>

        <div className="card">
          <h3>Pending Purchase Requisitions</h3>
          {loading ? (
            <p>Loading approval queue...</p>
          ) : purchaseRequisitions.length === 0 ? (
            <p>No PRs are pending for your queue right now.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>PR Number</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Requested By</th>
                      <th>Item</th>
                      <th>Estimated Cost</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Comments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((pr) => (
                      <tr key={pr.id}>
                        <td>{pr.pr_number}</td>
                        <td>{pr.title}</td>
                        <td>{pr.department}</td>
                        <td>{pr.requested_by}</td>
                        <td>{pr.item_name}</td>
                        <td>${Number(pr.estimated_cost).toFixed(2)}</td>
                        <td>{pr.priority}</td>
                        <td><StatusBadge status={pr.status} /></td>
                        <td>
                          <textarea
                            className="table-textarea"
                            onChange={(event) =>
                              setComments((current) => ({ ...current, [pr.id]: event.target.value }))
                            }
                            placeholder="Add approval comments"
                            rows="3"
                            value={comments[pr.id] || ""}
                          />
                        </td>
                        <td>
                          <div className="action-column">
                            <Link className="inline-link" to={`/purchase-requisitions/${pr.id}`}>
                              View details
                            </Link>
                            <button
                              disabled={actioningId === pr.id}
                              onClick={() => handleAction(pr.id, "approve")}
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="danger-button"
                              disabled={actioningId === pr.id}
                              onClick={() => handleAction(pr.id, "reject")}
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} onPageChange={setCurrentPage} totalPages={totalPages} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
