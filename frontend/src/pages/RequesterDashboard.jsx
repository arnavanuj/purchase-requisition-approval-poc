import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";

export default function RequesterDashboard({ user, onLogout, setToast }) {
  const [purchaseRequisitions, setPurchaseRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getPurchaseRequisitions();
        setPurchaseRequisitions(data);
      } catch (error) {
        setToast(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [setToast]);

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
                      <td>{pr.pr_number}</td>
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
