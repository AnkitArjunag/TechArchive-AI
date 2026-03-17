import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function Signup() {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    if (!email.includes("@")) {
      alert("Enter a valid email");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      // 🔥 Replace with backend later
      console.log("Signup:", { name, email, password });

      // Simulate success
      setTimeout(() => {
        localStorage.setItem("token", "demo-token");
        navigate("/dashboard");
      }, 800);

    } catch (err) {
      console.error(err);
      alert("Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h1 className="auth-title">TechArchive AI</h1>

        <h2>Create Account</h2>

        <p style={{ textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
          Start your research journey
        </p>

        <form onSubmit={handleSignup}>

          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            className="auth-input"
          />

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

          <button className="auth-button" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>

        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/">Login</Link>
        </p>

      </div>

    </div>
  );
}

export default Signup;