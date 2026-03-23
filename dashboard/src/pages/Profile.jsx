import React, { useState } from "react";
import axios from "axios";
import "../App.css";

const API = "http://localhost:8000";

const Profile = () => {

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`
  };

  return (
    <div className="settings-container">

      <h2>Settings</h2>

      <div className="settings-card">
        <h3>Profile</h3>
        <input placeholder="New name" onChange={e => setName(e.target.value)} />
        <button onClick={() => axios.put(`${API}/user/update-name`, { name }, { headers })}>
          Update Name
        </button>
      </div>

      <div className="settings-card">
        <h3>Security</h3>
        <input type="password" placeholder="New password" onChange={e => setPassword(e.target.value)} />
        <button onClick={() => axios.put(`${API}/user/change-password`, { password }, { headers })}>
          Change Password
        </button>
      </div>

      <div className="settings-card danger">
        <button onClick={() => axios.delete(`${API}/threads`, { headers })}>
          Delete All Chats
        </button>
        <button onClick={() => {
          axios.delete(`${API}/user/delete-account`, { headers });
          localStorage.removeItem("token");
          window.location.href = "/";
        }}>
          Delete Account
        </button>
      </div>

    </div>
  );
};

export default Profile;
