import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Signup() {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    console.log("Signup Data:", {
      name,
      email,
      password
    });

    // Backend will be connected later
    alert("Signup successful (backend not connected yet)");

    navigate("/dashboard");
  };

  return (

    <div className="auth-container">

      <div className="auth-card">

        <h1 className="auth-title">TechArchive AI</h1>

        <h2>Create Account</h2>

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

          <button className="auth-button">
            Sign Up
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