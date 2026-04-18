import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000/api";

const Profile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [newPassword, setNewPassword] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // ---------------- FETCH PROFILE ----------------
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();
      setProfile(data);
      setNewName(data.name);
    } catch {
      localStorage.removeItem("token");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatDate = (date) =>
    new Date(date).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

  // ---------------- UPDATE NAME ----------------
  const updateName = async () => {
    await fetch(`${API}/update-name`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    setProfile({ ...profile, name: newName });
    setEditing(false);
  };

  // ---------------- CHANGE PASSWORD ----------------
  const handleChangePassword = async () => {
    if (!newPassword.current || !newPassword.new || !newPassword.confirm) {
      alert("Please fill all fields");
      return;
    }

    if (newPassword.new !== newPassword.confirm) {
      alert("Passwords do not match");
      return;
    }

    try {
      await fetch(`${API}/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          current_password: newPassword.current,
          new_password: newPassword.new,
        }),
      });

      alert("Password updated successfully");

      setShowPassword(false);
      setNewPassword({ current: "", new: "", confirm: "" });

    } catch {
      alert("Failed to update password");
    }
  };

  // ---------------- DELETE ACCOUNT ----------------
  const deleteAccount = async () => {
    await fetch(`${API}/delete-account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) return <div className="text-white p-10">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-8">
        <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
          ← Back
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/");
          }}
          className="px-4 py-2 bg-red-500/20 border border-red-500 rounded-xl"
        >
          Logout
        </button>
      </div>

      {/* CARD */}
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

        {/* TITLE */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Profile
          </h1>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={updateName} className="px-4 py-2 bg-green-500 rounded-xl">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-600 rounded-xl">
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* PROFILE HEADER */}
        <div className="flex items-center gap-6 mb-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold">
            {profile.name[0]}
          </div>

          <div>
            {editing ? (
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="text-xl bg-transparent border-b border-white/20 focus:outline-none"
              />
            ) : (
              <h2 className="text-xl font-semibold">{profile.name}</h2>
            )}
            <p className="text-gray-400">{profile.email}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <p className="text-gray-400">Chat Sessions</p>
            <h2 className="text-3xl text-purple-400">{profile.chats}</h2>
          </div>

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <p className="text-gray-400">Join Date</p>
            <h2 className="text-green-400">{formatDate(profile.joined)}</h2>
          </div>
        </div>

        {/* SECURITY */}
        <div className="grid grid-cols-2 gap-6">

          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="mb-4">Security</h2>
            <button
              onClick={() => setShowPassword(true)}
              className="w-full py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl"
            >
              Change Password
            </button>
          </div>

          {/* ✅ FIXED DANGER ZONE */}
          <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl">
            <h2 className="text-red-400 mb-3 text-lg font-semibold">
              Danger Zone
            </h2>

            <p className="text-gray-400 text-sm mb-5">
              This action is irreversible. Deleting your account will remove all your data permanently.
            </p>

            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl hover:opacity-90 transition"
            >
              Delete Account
            </button>
          </div>

        </div>
      </div>

      {/* PASSWORD MODAL */}
      {showPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-2xl w-96 border border-white/10">

            <h2 className="text-xl mb-5">Change Password</h2>

            {["current", "new", "confirm"].map((field) => (
              <div key={field} className="relative mb-4">
                <input
                  type={showPass[field] ? "text" : "password"}
                  placeholder={
                    field === "current"
                      ? "Current Password"
                      : field === "new"
                      ? "New Password"
                      : "Confirm Password"
                  }
                  onChange={(e) =>
                    setNewPassword((prev) => ({
                      ...prev,
                      [field]: e.target.value
                    }))
                  }
                  className="w-full p-3 pr-10 rounded-xl bg-white/10 border border-white/10 outline-none"
                />

                <span
                  onClick={() =>
                    setShowPass((prev) => ({
                      ...prev,
                      [field]: !prev[field]
                    }))
                  }
                  className="absolute right-3 top-3 cursor-pointer text-gray-400"
                >
                  {showPass[field] ? "🙈" : "👁️"}
                </span>
              </div>
            ))}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPassword(false)}>Cancel</button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4 text-red-400">Are you sure?</h2>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button onClick={deleteAccount} className="bg-red-600 px-3 py-1 rounded">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;