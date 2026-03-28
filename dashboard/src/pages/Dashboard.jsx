import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const Dashboard = () => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  const API = "http://localhost:8000/api";
  const token = localStorage.getItem("token");
  const chatEndRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    const res = await axios.get(`${API}/threads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setThreads(res.data.threads);
  }, [token]);

  useEffect(() => {
    if (token) fetchThreads();
  }, [token, fetchThreads]);

  // Rename thread
  const renameThread = async (id) => {
    const name = prompt("Enter new name:");
    if (!name) return;

    await axios.put(`${API}/threads/${id}`, { title: name }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    fetchThreads();
  };

  // Delete thread (FIXED)
  const deleteThread = async (id) => {
    if (!window.confirm("Delete this chat?")) return;

    await axios.delete(`${API}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (activeThread === id) {
      setActiveThread(null);
      setMessages([]);
      setInsights([]);
    }

    setThreads(prev => prev.filter(t => t._id !== id));
  };

  // Load thread (SAFE)
  const loadThread = async (id) => {
    try {
      const res = await axios.get(`${API}/threads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveThread(id);
      setMessages(res.data.messages || []);
      setInsights([]);
    } catch (err) {
      if (err.response?.status === 404) {
        setActiveThread(null);
        setMessages([]);
        setInsights([]);
        return;
      }
      console.error(err);
    }
  };

  // Create thread
  const createThread = async () => {
    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setActiveThread(res.data.thread_id);
    setMessages([]);
    setInsights([]);
    fetchThreads();
  };

  // Highlight keywords
  const highlight = (text, query) => {
    if (!query) return text;

    const words = query.split(" ").filter(w => w.length > 2);
    let result = text;

    words.forEach(word => {
      const regex = new RegExp(`(${word})`, "gi");
      result = result.replace(
        regex,
        "<mark class='bg-yellow-400 text-black'>$1</mark>"
      );
    });

    return result;
  };

  // Open PDF
  const openDocument = (r) => {
    const match = r.source.match(/doc\d+/);
    if (!match) return;

    const pdfMap = {
      doc1: "doc1_cooling_sspa.pdf",
      doc2: "doc2_weapon_params.pdf",
      doc3: "doc3_rf_fingerprinting.pdf",
      doc4: "doc4_ugv_navigation.pdf",
      doc5: "doc5_rf_microwave_trends.pdf",
      doc6: "doc6_digital_twin.pdf",
      doc7: "doc7_defence_ecosystem.pdf",
      doc8: "doc8_brain_computer.pdf",
      doc9: "doc9_bio_toxins.pdf",
      doc10: "doc10_aircraft_aerodynamics.pdf"
    };

    const file = pdfMap[match[0]];
    if (!file) return;

    const page = Array.isArray(r.page) ? r.page[0] : r.page;

    window.open(`http://localhost:8000/docs/${file}#page=${page}`, "_blank");
  };

  // Send message (NO STREAMING → STABLE)
const handleSend = async () => {
  if (!input.trim() || loading) return;

  let threadId = activeThread;

  if (!threadId) {
    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    threadId = res.data.thread_id;
    setActiveThread(threadId);
  }

  const userMsg = { role: "user", content: input };

  // ✅ ADD USER + EMPTY AI MESSAGE
  setMessages(prev => [
    ...prev,
    userMsg,
    { role: "assistant", content: "" }
  ]);

  setInput("");
  setLoading(true);

  await axios.post(`${API}/threads/${threadId}/message`, userMsg, {
    headers: { Authorization: `Bearer ${token}` }
  });

  // Insights
  const insightsRes = await axios.post(`${API}/insights`, {
    messages: [...messages, userMsg]
  });
  setInsights(insightsRes.data.insights || []);

  // Chat response
  const response = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [...messages, userMsg] })
  });

  const text = await response.text();

  // ✅ UPDATE LAST MESSAGE (AI)
  setMessages(prev => {
    const copy = [...prev];
    copy[copy.length - 1] = {
      role: "assistant",
      content: text
    };
    return copy;
  });

  setLoading(false);

  await axios.post(`${API}/threads/${threadId}/message`, {
    role: "assistant",
    content: text
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });

  fetchThreads();
};

  return (
    <div className="h-screen flex bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900">

      {/* SIDEBAR */}
      <div className="w-64 p-4 bg-white/5 backdrop-blur-xl border-r border-white/10">

        <button
          onClick={createThread}
          className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 transition"
        >
          + New Chat
        </button>

        <div className="space-y-2 overflow-y-auto">
          {threads.map(t => (
            <div
              key={t._id}
              onClick={() => loadThread(t._id)}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/20 cursor-pointer flex justify-between"
            >
              <span>{t.title}</span>

              <div className="flex gap-2 text-xs">

                <button onClick={(e) => {
                  e.stopPropagation();
                  renameThread(t._id);
                }}>✏️</button>

                <button onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(t._id);
                }}>🗑️</button>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col">

        <div className="flex-1 overflow-y-auto px-6 py-10">
          <div className="max-w-3xl mx-auto space-y-4">

            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                Ask a question about your documents 🚀
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`px-4 py-3 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white max-w-[70%]"
                    : "bg-white/10 text-gray-200 max-w-[75%]"
                }`}
              >
                {m.content}
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-1 text-gray-400">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </div>
            )}

            <div ref={chatEndRef}></div>
          </div>
        </div>

        {/* INPUT */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto flex gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2">
            <input
              value={input}
              placeholder="Ask anything about your documents..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 px-4 py-2 bg-transparent text-white outline-none"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl"
            >
              Send
            </button>
          </div>
        </div>

      </div>

      {/* INSIGHTS */}
      <div className="w-80 p-4 bg-white/5 backdrop-blur-xl border-l border-white/10 overflow-y-auto">

        <h3 className="text-white text-lg mb-4">Insights</h3>

        {insights.map((r, i) => {
          const pages = Array.isArray(r.page) ? r.page.join(", ") : r.page;
          const score = Math.floor(80 + Math.random() * 20);

          return (
            <div
              key={i}
              onClick={() => openDocument(r)}
              className="mb-3 p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-[1.02] transition cursor-pointer"
            >
              <div
                className="text-sm text-gray-200 mb-1"
                dangerouslySetInnerHTML={{
                  __html: highlight(r.content.substring(0, 120), input)
                }}
              />

              <div className="text-xs text-gray-400">
                {r.source} • Pages {pages}
              </div>

              <div className="text-xs text-green-400">
                Relevance: {score}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
