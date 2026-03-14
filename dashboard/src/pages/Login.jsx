import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();   // ✅ Hook must be inside component

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    console.log(email, password);

    navigate("/dashboard");
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

          <button className="auth-button">
            Login
          </button>

        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Signup</Link>
        </p>

      </div>

    </div>
  );
}

export default Login;