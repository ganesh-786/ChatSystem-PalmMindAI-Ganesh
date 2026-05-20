import { useState } from "react";
import api, { setAuthToken } from "../services/api.js";

const initialForm = {
  name: "",
  email: "",
  password: "",
};

export default function AuthPanel({ onLogin }) {
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = {
        email: form.email,
        password: form.password,
        ...(mode === "register" ? { name: form.name } : {}),
      };

      const response = await api.post(endpoint, payload);
      const { token, user } = response.data;
      setAuthToken(token);
      onLogin({ user, token });
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p>
          {mode === "login"
            ? "Access your chat workspace."
            : "Start a new chat account."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your display name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Processing..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "login" ? (
            <p>
              Need an account?{" "}
              <button type="button" onClick={() => setMode("register")}>
                Register
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
