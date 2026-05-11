import { useState } from "react";

import { api } from "../api";

export default function Login({ onLogin, setToast }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api.login(form);
      onLogin(data);
    } catch (error) {
      setToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <p>Use the seeded demo credentials to enter the workflow.</p>
        <label>
          Email
          <input name="email" onChange={handleChange} required type="email" value={form.email} />
        </label>
        <label>
          Password
          <input
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={form.password}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
        <div className="credentials">
          <p><strong>Requester:</strong> requester@test.com / password123</p>
          <p><strong>Approver 1:</strong> avi.anuj1@gmail.com / password123</p>
          <p><strong>Approver 2:</strong> arnav.anuj@gmail.com / password123</p>
        </div>
      </form>
    </div>
  );
}
