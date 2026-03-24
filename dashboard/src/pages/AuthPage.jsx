import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const endpoint = isLogin
      ? "http://localhost:8000/api/login"
      : "http://localhost:8000/api/register";

    const body = isLogin
      ? { email: form.email, password: form.password }
      : {
          name: form.name,
          email: form.email,
          password: form.password
        };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        return;
      }


      if (isLogin) {
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
      // After signup → switch to login
      setIsLogin(true);
  setForm({
    name: "",
    email: form.email, // keep email for convenience
    password: "",
    confirmPassword: ""
  });
  setError("Account created! Please login.");
}

    } catch (err) {
      console.error(err);
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0">
        <div className="absolute w-72 h-72 bg-blue-500/30 blur-3xl rounded-full top-1/4 left-1/4 animate-blob"></div>
        <div className="absolute w-72 h-72 bg-purple-500/30 blur-3xl rounded-full top-1/3 right-1/4 animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            TechArchive AI
          </h1>
          <p className="text-gray-300 text-sm mt-2">
            Your AI Research Assistant
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">

          <form onSubmit={handleSubmit} className="space-y-4">

            {!isLogin && (
              <input
                name="name"
                placeholder="Full Name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder-gray-300"
              />
            )}

            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder-gray-300"
            />

            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder-gray-300"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-300"
              >
                {showPassword ? "🔓" : "🔒"}
              </button>
            </div>

            {!isLogin && (
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder-gray-300"
              />
            )}

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* MAIN CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition"
            >
              {loading
                ? "Processing..."
                : isLogin
                ? "Login"
                : "Create Account"}
            </button>

          </form>

          {/* 🔥 Bottom Switch */}
          <div className="text-center mt-6 text-sm text-gray-300">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-blue-400 hover:underline"
                >
                  Signup
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-blue-400 hover:underline"
                >
                  Login
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

export default AuthPage;