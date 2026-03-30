import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000/api";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDanger, setShowDanger] = useState(false);

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [confirmDelete, setConfirmDelete] = useState(false);


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
  } catch (err) {
    localStorage.removeItem("token");
    navigate("/");
  } finally {
    setLoading(false);
  }
}, [navigate]);

    useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);


  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

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

  const changePassword = async () => {
    await fetch(`${API}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    setShowPassword(false);
    setNewPassword("");
  };

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

  if (loading) {
    return <div className="text-white p-10">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
          ← Back
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/");
          }}
          className="px-4 py-2 bg-red-500/20 border border-red-500 rounded-xl hover:bg-red-500/40"
        >
          Logout
        </button>
      </div>

      {/* MAIN CARD */}
      <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

        {/* TOP */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Profile
          </h1>

          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl hover:scale-105 transition"
          >
            Edit Profile
          </button>
        </div>

        {/* USER INFO */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
            {profile.name[0]}
          </div>

          <div>
            <h2 className="text-xl font-semibold">{profile.name}</h2>
            <p className="text-gray-400">{profile.email}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-6 mb-8">
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

          <div className="bg-red-500/10 border border-red-500 p-6 rounded-2xl">
            <h2
              onClick={() => setShowDanger(!showDanger)}
              className="cursor-pointer text-red-400"
            >
              Danger Zone
            </h2>

            {showDanger && (
              <div className="mt-4">
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4">Edit Name</h2>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2 rounded bg-gray-800"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)}>Cancel</button>
              <button onClick={updateName}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-xl w-80">
            <h2 className="mb-4">Change Password</h2>
            <input
              type="password"
              placeholder="New password"
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-800"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPassword(false)}>Cancel</button>
              <button onClick={changePassword}>Update</button>
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
              <button
                onClick={deleteAccount}
                className="bg-red-600 px-3 py-1 rounded"
              >
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