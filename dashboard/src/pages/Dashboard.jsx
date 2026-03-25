import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

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

  // 🔥 Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Fetch threads
  const fetchThreads = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/threads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThreads(res.data.threads);
    } catch (err) {
      console.error("Fetch threads error:", err);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchThreads();
  }, [token, fetchThreads]);

  // 🔥 Create new thread
  const createThread = async () => {
    try {
      const res = await axios.post(`${API}/threads`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newThreadId = res.data.thread_id;

      setActiveThread(newThreadId);
      setMessages([]);
      setInsights([]);

      setThreads(prev => [
        { _id: newThreadId, title: "New Chat", messages: [] },
        ...prev
      ]);

    } catch (err) {
      console.error("Create thread error:", err);
    }
  };

  // 🔥 Load thread (FIXED)
  const loadThread = async (threadId) => {
    try {
      const res = await axios.get(`${API}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveThread(threadId);
      setMessages(res.data.messages || []);
      setInsights([]);

    } catch (err) {
      console.error("Load thread error:", err.response?.data || err);
    }
  };

  // 🔥 Send message (FIXED PAYLOAD)
  const handleSend = async () => {
    if (!input.trim()) return;

    let threadId = activeThread;

    // create thread if none
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

    try {
      // save user msg
      await axios.post(`${API}/threads/${threadId}/message`, userMsg, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🔥 FIXED: correct format
      const res = await axios.post(`${API}/chat`, {
        messages: updated.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const aiMsg = { role: "assistant", content: res.data.answer };

      setMessages([...updated, aiMsg]);
      setInsights(res.data.insights || []);
      setLoading(false);

      // save AI msg
      await axios.post(`${API}/threads/${threadId}/message`, aiMsg, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchThreads();

    } catch (err) {
      console.error("CHAT ERROR:", err.response?.data || err);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900">

      {/* HEADER */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="text-white font-semibold text-lg">TechArchive AI</div>
        <button onClick={() => window.location.href="/profile"}>👤</button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col">

          <button
            onClick={createThread}
            className="mb-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 transition"
          >
            + New Chat
          </button>

          <h3 className="text-gray-400 text-sm mb-2">Recent Chats</h3>

          <div className="flex-1 space-y-2 overflow-y-auto">

            {threads.length === 0 && (
              <div className="text-gray-500 text-sm p-4 bg-white/5 rounded-xl">
                No conversations yet
              </div>
            )}

            {threads.map(t => (
              <div
                key={t._id}
                onClick={() => loadThread(t._id)}
                className={`p-3 rounded-xl cursor-pointer text-sm ${
                  activeThread === t._id
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {t.title}
              </div>
            ))}

          </div>

          <button
            onClick={() => window.location.href="/profile"}
            className="mt-4 py-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition"
          >
            Profile
          </button>
        </div>

        {/* MAIN */}
        <div className="flex-1 flex flex-col relative">

          <div className="flex-1 flex items-center justify-center overflow-y-auto">

            {messages.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center max-w-md shadow-xl">
                <div className="text-5xl mb-4">📚</div>

                <h2 className="text-xl text-white font-semibold mb-2">
                  Welcome to TechArchive AI
                </h2>

                <p className="text-gray-300 text-sm mb-4">
                  Your intelligent research assistant is ready to help with
                  document analysis, insights, and answers.
                </p>

                <button
                  onClick={createThread}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white hover:scale-105 transition"
                >
                  Start a new chat
                </button>
              </div>
            ) : (
              <div className="w-full px-6 py-10">
                <div className="max-w-3xl mx-auto space-y-4">

                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`px-4 py-3 rounded-2xl text-sm ${
                        m.role === "user"
                          ? "ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white max-w-[70%]"
                          : "bg-white/10 text-gray-200 max-w-[75%]"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-1 px-4">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></span>
                    </div>
                  )}

                  <div ref={chatEndRef}></div>
                </div>
              </div>
            )}

          </div>

          {/* 🔥 FIXED INPUT */}
          {activeThread && (
            <div className="sticky bottom-0 p-4">
              <div className="max-w-3xl mx-auto flex gap-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2">

                <input
                  value={input}
                  placeholder="Ask the research agent..."
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 px-4 py-2 bg-transparent text-white outline-none"
                />

                <button
                  onClick={handleSend}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl"
                >
                  Send
                </button>

              </div>
            </div>
          )}

        </div>

        {/* INSIGHTS */}
        <div className="w-80 bg-white/5 backdrop-blur-xl border-l border-white/10 p-4 overflow-y-auto">

          <h3 className="text-white text-lg mb-4">Insights</h3>

          {insights.length === 0 && (
            <div className="text-gray-400">No insights yet</div>
          )}

          {insights.map((r, i) => (
            <div key={i} className="mb-3 p-3 rounded-xl bg-white/10 border border-white/20">
              <div className="text-sm text-gray-200 mb-1">
                {r.content.substring(0, 120)}...
              </div>
              <div className="text-xs text-gray-400">
                {r.source} • Page {r.page}
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default Dashboard;