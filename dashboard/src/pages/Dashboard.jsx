import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import "../App.css";

const Dashboard = () => {

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  const API = "http://localhost:8000";
  const token = localStorage.getItem("token");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchThreads = useCallback(async () => {
    const res = await axios.get(`${API}/threads`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setThreads(res.data.threads);

    if (res.data.threads.length > 0 && !activeThread) {
      setActiveThread(res.data.threads[0]._id);
      setMessages(res.data.threads[0].messages || []);
    }
  }, [token, activeThread]);

  useEffect(() => {
    if (token) fetchThreads();
  }, [token, fetchThreads]);

  const createThread = async () => {
    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setActiveThread(res.data.thread_id);
    setMessages([]);
    fetchThreads();
  };

  const deleteThread = async (id) => {
    await axios.delete(`${API}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (id === activeThread) {
      setActiveThread(null);
      setMessages([]);
    }

    fetchThreads();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    await axios.post(`${API}/upload-pdf`, formData);
    alert("PDF added!");
  };

  const handleSend = async () => {

    if (!input.trim()) return;

    let threadId = activeThread;

    if (!threadId) {
      const res = await axios.post(`${API}/threads`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      threadId = res.data.thread_id;
      setActiveThread(threadId);
    }

    const userMsg = { role: "user", content: input };
    const updated = [...messages, userMsg];

    setMessages(updated);
    setInput("");
    setLoading(true);

    await axios.post(`${API}/threads/${threadId}/message`, userMsg, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const res = await axios.post(`${API}/chat`, {
      messages: updated
    });

    const aiMsg = { role: "assistant", content: res.data.answer };

    setMessages([...updated, aiMsg]);
    setInsights(res.data.insights || []);
    setLoading(false);

    await axios.post(`${API}/threads/${threadId}/message`, aiMsg, {
      headers: { Authorization: `Bearer ${token}` }
    });

    fetchThreads();
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div className="topbar">
        <div className="logo">TechArchive AI</div>
        <button className="profile-btn" onClick={() => window.location.href="/profile"}>
          Profile
        </button>
      </div>

      <div className="layout">

        {/* SIDEBAR */}
        <div className="sidebar">
          <button className="new-chat" onClick={createThread}>+ New Chat</button>

          {threads.map(t => (
            <div key={t._id} className="thread">
              <span onClick={() => {
                setActiveThread(t._id);
                setMessages(t.messages || []);
              }}>
                {t.title}
              </span>
              <button onClick={() => deleteThread(t._id)}>🗑</button>
            </div>
          ))}
        </div>

        {/* MAIN CHAT */}
        <div className="chat-panel">

          <div className="chat-box">
            {messages.length === 0 && (
              <div className="empty-state">
                Ask anything about your research...
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                {m.content}
              </div>
            ))}

            {loading && <div className="typing">● ● ●</div>}
            <div ref={chatEndRef}></div>
          </div>

          {/* INPUT */}
          <div className="input-area">
            <input
              type="text"
              value={input}
              placeholder="Ask the research agent..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <button onClick={handleSend}>Run</button>

            <label className="upload-btn">
              Upload
              <input type="file" onChange={handleUpload} hidden />
            </label>
          </div>

        </div>

        {/* INSIGHTS */}
        <div className="insights-panel">
          <h3>Insights</h3>

          {insights.length === 0 && <div>No insights yet</div>}

          {insights.map((r, i) => (
            <div key={i} className="result-card">
              <div className="hardware">Chunk</div>
              <div>{r.content.substring(0,120)}...</div>
              <div className="source">{r.source} • Page {r.page}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
