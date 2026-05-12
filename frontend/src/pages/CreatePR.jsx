import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import Navbar from "../components/Navbar";

const initialForm = {
  title: "",
  department: "",
  requested_by: "",
  item_name: "",
  item_description: "",
  quantity: 1,
  estimated_cost: "",
  business_justification: "",
  required_date: "",
  priority: "Medium",
};

export default function CreatePR({ user, onLogout, setToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = useMemo(() => Boolean(id), [id]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEditMode);
  const [existingPr, setExistingPr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) {
      setLoading(false);
      setExistingPr(null);
      setForm(initialForm);
      return;
    }

    async function loadPurchaseRequisition() {
      setLoading(true);
      try {
        const data = await api.getPurchaseRequisition(id);
        if (data.status === "Fully Approved") {
          sessionStorage.setItem("toastMessage", "Fully Approved PR cannot be edited.");
          navigate("/requester");
          return;
        }

        setExistingPr(data);
        setForm({
          title: data.title,
          department: data.department,
          requested_by: data.requested_by,
          item_name: data.item_name,
          item_description: data.item_description,
          quantity: data.quantity,
          estimated_cost: Number(data.estimated_cost),
          business_justification: data.business_justification,
          required_date: data.required_date,
          priority: data.priority,
        });
      } catch (error) {
        setToast(error.message);
        navigate("/requester");
      } finally {
        setLoading(false);
      }
    }

    loadPurchaseRequisition();
  }, [id, isEditMode, navigate, setToast]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        estimated_cost: Number(form.estimated_cost),
      };
      const response = isEditMode
        ? await api.updatePurchaseRequisition(id, payload)
        : await api.createPurchaseRequisition(payload);
      sessionStorage.setItem("toastMessage", response.toast_message);
      navigate("/requester");
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
            <p>Loading purchase requisition...</p>
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
            <h2>{isEditMode ? "Edit Purchase Requisition" : "Create Purchase Requisition"}</h2>
            <p>
              {isEditMode
                ? "Update the PR details and resubmit it through the approval workflow."
                : "Submit a new PR to start the two-level approval workflow."}
            </p>
          </div>
        </div>

        <form className="card form-grid" onSubmit={handleSubmit}>
          {isEditMode ? (
            <>
              <div className="readonly-field">
                <span className="readonly-field__label">PR Number</span>
                <strong>{existingPr?.pr_number}</strong>
              </div>
              <div className="readonly-field">
                <span className="readonly-field__label">Created Date</span>
                <strong>{existingPr ? new Date(existingPr.created_at).toLocaleString() : ""}</strong>
              </div>
            </>
          ) : null}
          <label>
            PR Title
            <input name="title" onChange={handleChange} required value={form.title} />
          </label>
          <label>
            Department
            <input name="department" onChange={handleChange} required value={form.department} />
          </label>
          <label>
            Requested By
            <input name="requested_by" onChange={handleChange} required value={form.requested_by} />
          </label>
          <label>
            Item Name
            <input name="item_name" onChange={handleChange} required value={form.item_name} />
          </label>
          <label className="full-width">
            Item Description
            <textarea
              name="item_description"
              onChange={handleChange}
              required
              rows="3"
              value={form.item_description}
            />
          </label>
          <label>
            Quantity
            <input min="1" name="quantity" onChange={handleChange} required type="number" value={form.quantity} />
          </label>
          <label>
            Estimated Cost
            <input
              min="0.01"
              name="estimated_cost"
              onChange={handleChange}
              required
              step="0.01"
              type="number"
              value={form.estimated_cost}
            />
          </label>
          <label className="full-width">
            Business Justification
            <textarea
              name="business_justification"
              onChange={handleChange}
              required
              rows="4"
              value={form.business_justification}
            />
          </label>
          <label>
            Required Date
            <input name="required_date" onChange={handleChange} required type="date" value={form.required_date} />
          </label>
          <label>
            Priority
            <select name="priority" onChange={handleChange} value={form.priority}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
          <div className="full-width">
            <button disabled={submitting} type="submit">
              {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Submit PR"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
