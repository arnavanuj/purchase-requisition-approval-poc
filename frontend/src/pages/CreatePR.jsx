import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.createPurchaseRequisition({
        ...form,
        quantity: Number(form.quantity),
        estimated_cost: Number(form.estimated_cost),
      });
      sessionStorage.setItem("toastMessage", response.toast_message);
      navigate("/requester");
    } catch (error) {
      setToast(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <Navbar user={user} onLogout={onLogout} />
      <main className="content">
        <div className="page-header">
          <div>
            <h2>Create Purchase Requisition</h2>
            <p>Submit a new PR to start the two-level approval workflow.</p>
          </div>
        </div>

        <form className="card form-grid" onSubmit={handleSubmit}>
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
              {submitting ? "Submitting..." : "Submit PR"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
