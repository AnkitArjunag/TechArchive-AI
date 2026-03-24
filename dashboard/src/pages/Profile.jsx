import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const Profile = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 p-6">

      <div className="max-w-3xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold text-white text-center mb-6">
          Settings
        </h1>

        {/* Profile Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>

          <input
            placeholder="New name"
            onChange={e => setName(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400"
          />

          <button
            onClick={() => axios.put(`${API}/user/update-name`, { name }, { headers })}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:scale-105 transition"
          >
            Update Name
          </button>
        </div>

        {/* Security */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Security</h2>

          <input
            type="password"
            placeholder="New password"
            onChange={e => setPassword(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400"
          />

          <button
            onClick={() => axios.put(`${API}/user/change-password`, { password }, { headers })}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold hover:scale-105 transition"
          >
            Change Password
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>

          <button
            onClick={() => axios.delete(`${API}/threads`, { headers })}
            className="w-full mb-3 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold hover:scale-105 transition"
          >
            Delete All Chats
          </button>

          <button
            onClick={() => {
              axios.delete(`${API}/user/delete-account`, { headers });
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-semibold hover:scale-105 transition"
          >
            Delete Account
          </button>
        </div>

      </div>
    </div>
  );
};

export default Profile;