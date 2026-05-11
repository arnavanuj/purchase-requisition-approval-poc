const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Something went wrong.");
  }
  return data;
}

export const api = {
  login: (payload) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPurchaseRequisitions: () => request("/purchase-requisitions"),
  getPurchaseRequisition: (id) => request(`/purchase-requisitions/${id}`),
  createPurchaseRequisition: (payload) =>
    request("/purchase-requisitions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approvePurchaseRequisition: (id, payload) =>
    request(`/purchase-requisitions/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  rejectPurchaseRequisition: (id, payload) =>
    request(`/purchase-requisitions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getNotifications: () => request("/notifications"),
};
