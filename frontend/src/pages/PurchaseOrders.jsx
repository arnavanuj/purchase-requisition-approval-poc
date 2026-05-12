import { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import Navbar from "../components/Navbar";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";

export default function PurchaseOrders({ user, onLogout, setToast }) {
  const recordsPerPage = 10;
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrders();
      setPurchaseOrders(data);
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
    const handleWindowClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  useEffect(() => {
    setCurrentPage((page) => {
      const nextTotalPages = Math.max(1, Math.ceil(purchaseOrders.length / recordsPerPage));
      return Math.min(page, nextTotalPages);
    });
  }, [purchaseOrders.length]);

  const totalPages = Math.max(1, Math.ceil(purchaseOrders.length / recordsPerPage));
  const currentRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return purchaseOrders.slice(startIndex, startIndex + recordsPerPage);
  }, [currentPage, purchaseOrders]);

  const toggleMenu = (event, poId) => {
    event.preventDefault();
    event.stopPropagation();
    setOpenMenuId((current) => (current === poId ? null : poId));
  };

  const handleGoodsReceipt = async (poId) => {
    setOpenMenuId(null);
    if (!window.confirm("Confirm goods receipt for this PO?")) {
      return;
    }

    setActioningId(poId);
    try {
      const response = await api.markGoodsReceipt(poId);
      setToast(response.toast_message);
      await loadData();
    } catch (error) {
      setToast(error.message);
    } finally {
      setActioningId(null);
    }
  };

  const handlePdfPreview = async (poId) => {
    setOpenMenuId(null);
    setActioningId(poId);
    try {
      const data = await api.getPurchaseOrderPdfPreview(poId);
      setPreviewData(data);
      setPreviewOpen(true);
    } catch (error) {
      setToast(error.message);
    } finally {
      setActioningId(null);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const canShowGoodsReceipt = (purchaseOrder) =>
    user.role === "requester" && purchaseOrder.status === "Generated";

  return (
    <div className="page-shell">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <div className="page-header">
          <div>
            <h2>Purchase Orders</h2>
            <p>Review the automatically generated purchase orders created from fully approved PRs.</p>
          </div>
        </div>

        <div className="card">
          <h3>Generated Purchase Orders</h3>
          {loading ? (
            <p>Loading purchase orders...</p>
          ) : purchaseOrders.length === 0 ? (
            <p>No purchase orders have been generated yet.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>PR Number</th>
                      <th>PO Number</th>
                      <th>Supplier Name</th>
                      <th>Item Name</th>
                      <th>Quantity</th>
                      <th>Amount</th>
                      <th>Created Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((purchaseOrder) => (
                      <tr key={purchaseOrder.id}>
                        <td>{purchaseOrder.pr_number}</td>
                        <td>{purchaseOrder.po_number}</td>
                        <td>{purchaseOrder.supplier_name}</td>
                        <td>{purchaseOrder.item_name}</td>
                        <td>{purchaseOrder.quantity}</td>
                        <td>${Number(purchaseOrder.amount).toFixed(2)}</td>
                        <td>{new Date(purchaseOrder.created_at).toLocaleDateString()}</td>
                        <td><StatusBadge status={purchaseOrder.status} /></td>
                        <td>
                          <div className="pr-action-menu">
                            <button
                              aria-expanded={openMenuId === purchaseOrder.id}
                              aria-haspopup="menu"
                              className="icon-button"
                              disabled={actioningId === purchaseOrder.id}
                              onClick={(event) => toggleMenu(event, purchaseOrder.id)}
                              onContextMenu={(event) => toggleMenu(event, purchaseOrder.id)}
                              type="button"
                            >
                              &#8942;
                            </button>
                            {openMenuId === purchaseOrder.id ? (
                              <div className="dropdown-menu dropdown-menu--right" role="menu">
                                {canShowGoodsReceipt(purchaseOrder) ? (
                                  <button
                                    className="dropdown-menu__item"
                                    onClick={() => handleGoodsReceipt(purchaseOrder.id)}
                                    type="button"
                                  >
                                    Goods Receipt
                                  </button>
                                ) : null}
                                <button
                                  className="dropdown-menu__item"
                                  onClick={() => handlePdfPreview(purchaseOrder.id)}
                                  type="button"
                                >
                                  PDF Preview
                                </button>
                              </div>
                            ) : null}
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

        {previewOpen && previewData ? (
          <div className="modal-backdrop" onClick={closePreview}>
            <div className="modal-card po-preview" onClick={(event) => event.stopPropagation()}>
              <div className="po-preview__header">
                <div>
                  <h3>Purchase Order Preview</h3>
                  <p>Formal document view for browser preview and printing.</p>
                </div>
                <div className="po-preview__actions">
                  <button onClick={() => window.print()} type="button">
                    Print
                  </button>
                  <button className="secondary-button" onClick={closePreview} type="button">
                    Close
                  </button>
                </div>
              </div>

              <div className="po-document">
                <div className="po-document__title">
                  <h2>Purchase Order</h2>
                  <StatusBadge status={previewData.approval_status} />
                </div>
                <div className="po-document__grid">
                  <p><strong>PO Number:</strong> {previewData.po_number}</p>
                  <p><strong>PR Number:</strong> {previewData.pr_number}</p>
                  <p><strong>Supplier Name:</strong> {previewData.supplier_name}</p>
                  <p><strong>Created By:</strong> {previewData.created_by}</p>
                  <p><strong>Created Date:</strong> {new Date(previewData.created_at).toLocaleString()}</p>
                  <p><strong>Required Date:</strong> {new Date(previewData.required_date).toLocaleDateString()}</p>
                  <p><strong>Item Name:</strong> {previewData.item_name}</p>
                  <p><strong>Quantity:</strong> {previewData.quantity}</p>
                  <p><strong>Amount:</strong> ${Number(previewData.amount).toFixed(2)}</p>
                </div>

                <section className="po-document__section">
                  <h4>Item Description</h4>
                  <p>{previewData.item_description}</p>
                </section>

                <section className="po-document__section">
                  <h4>Business Justification</h4>
                  <p>{previewData.business_justification}</p>
                </section>

                <section className="po-document__section">
                  <h4>Approver 1 Details</h4>
                  {previewData.approver_1_details.length === 0 ? (
                    <p>No Approver 1 actions recorded.</p>
                  ) : (
                    previewData.approver_1_details.map((item) => (
                      <div className="history-item" key={`a1-${item.id}`}>
                        <p><strong>{item.action}</strong> by {item.approver_email}</p>
                        <p>{item.comments}</p>
                        <small>{new Date(item.action_date).toLocaleString()}</small>
                      </div>
                    ))
                  )}
                </section>

                <section className="po-document__section">
                  <h4>Approver 2 Details</h4>
                  {previewData.approver_2_details.length === 0 ? (
                    <p>No Approver 2 actions recorded.</p>
                  ) : (
                    previewData.approver_2_details.map((item) => (
                      <div className="history-item" key={`a2-${item.id}`}>
                        <p><strong>{item.action}</strong> by {item.approver_email}</p>
                        <p>{item.comments}</p>
                        <small>{new Date(item.action_date).toLocaleString()}</small>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
