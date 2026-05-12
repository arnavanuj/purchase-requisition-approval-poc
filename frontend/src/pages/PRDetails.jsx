import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";

function canTakeAction(user, pr) {
  if (!user || !pr) {
    return false;
  }
  if (user.role === "approver1" && pr.status === "Pending Level 1 Approval") {
    return true;
  }
  if (user.role === "approver2" && pr.status === "Pending Level 2 Approval") {
    return true;
  }
  return false;
}

export default function PRDetails({ user, onLogout, setToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [pr, setPr] = useState(null);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await api.getPurchaseRequisition(id);
        setPr(data);
      } catch (error) {
        setToast(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id, setToast]);

  useEffect(() => {
    const toastMessage = sessionStorage.getItem("toastMessage");
    if (toastMessage) {
      setToast(toastMessage);
      sessionStorage.removeItem("toastMessage");
    }
  }, [setToast]);

  const showActions = useMemo(() => canTakeAction(user, pr), [user, pr]);

  const handleAction = async (action) => {
    if (!comments.trim()) {
      setToast("Comments are required before approving or rejecting.");
      return;
    }

    setSubmitting(true);
    try {
      const response =
        action === "approve"
          ? await api.approvePurchaseRequisition(id, { comments })
          : await api.rejectPurchaseRequisition(id, { comments });
      setPr(response.pr);
      setComments("");
      setToast(response.toast_message);
    } catch (error) {
      setToast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <Navbar user={user} onLogout={onLogout} />
        <main className="content">
          <div className="card">
            <p>Loading PR details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="page-shell">
        <Navbar user={user} onLogout={onLogout} />
        <main className="content">
          <div className="card">
            <p>PR not found.</p>
            <button onClick={() => navigate(user.role === "requester" ? "/requester" : "/approvals")} type="button">
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <div className="page-header">
          <div>
            <h2>{pr.pr_number}</h2>
            <p>{pr.title}</p>
          </div>
          <StatusBadge status={pr.status} />
        </div>

        <div className="details-grid">
          <section className="card">
            <h3>PR Details</h3>
            <div className="detail-list">
              <p><strong>Department:</strong> {pr.department}</p>
              <p><strong>Requested By:</strong> {pr.requested_by}</p>
              <p><strong>Supplier Name:</strong> {pr.supplier_name}</p>
              <p><strong>Item Name:</strong> {pr.item_name}</p>
              <p><strong>Item Description:</strong> {pr.item_description}</p>
              <p><strong>Quantity:</strong> {pr.quantity}</p>
              <p><strong>Estimated Cost:</strong> ${Number(pr.estimated_cost).toFixed(2)}</p>
              <p><strong>Business Justification:</strong> {pr.business_justification}</p>
              <p><strong>Required Date:</strong> {new Date(pr.required_date).toLocaleDateString()}</p>
              <p><strong>Priority:</strong> {pr.priority}</p>
              <p><strong>Current Approval Level:</strong> {pr.current_approval_level}</p>
              <p><strong>Created By:</strong> {pr.creator_email}</p>
              <p><strong>Created Date:</strong> {new Date(pr.created_at).toLocaleString()}</p>
            </div>
          </section>

          <section className="card">
            <h3>Approval History</h3>
            {pr.approval_history.length === 0 ? (
              <p>No approvals recorded yet.</p>
            ) : (
              <div className="history-list">
                {pr.approval_history.map((item) => (
                  <div className="history-item" key={item.id}>
                    <p><strong>{item.action}</strong> by {item.approver_email}</p>
                    <p>{item.approval_level}</p>
                    <p>{item.comments}</p>
                    <small>{new Date(item.action_date).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h3>Fake Notification History</h3>
            {pr.notifications.length === 0 ? (
              <p>No notifications logged yet.</p>
            ) : (
              <div className="history-list">
                {pr.notifications.map((item) => (
                  <div className="history-item" key={item.id}>
                    <p><strong>{item.recipient_email}</strong></p>
                    <p className="multiline-text">{item.message}</p>
                    <small>{new Date(item.created_at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </section>

          {showActions && (
            <section className="card">
              <h3>Take Action</h3>
              <label>
                Comments
                <textarea rows="4" value={comments} onChange={(event) => setComments(event.target.value)} />
              </label>
              <div className="button-row">
                <button disabled={submitting} onClick={() => handleAction("approve")} type="button">
                  Approve
                </button>
                <button
                  className="danger-button"
                  disabled={submitting}
                  onClick={() => handleAction("reject")}
                  type="button"
                >
                  Reject
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
