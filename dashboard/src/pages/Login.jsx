import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Invalid credentials");
        return;
      }

      localStorage.setItem("token", data.token);

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <h1 className="auth-title">TechArchive AI</h1>
        <h2>Login</h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="auth-input"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="auth-input"
          />

          <button className="auth-button">Login</button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;