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

  // 🔥 Auto scroll
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
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchThreads();
  }, [token, fetchThreads]);

  // 🔥 Create thread
  const createThread = async () => {
    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const id = res.data.thread_id;
    setActiveThread(id);
    setMessages([]);
    setInsights([]);
    fetchThreads();
  };

  // 🔥 Load thread
  const loadThread = async (id) => {
    const res = await axios.get(`${API}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setActiveThread(id);
    setMessages(res.data.messages || []);
    setInsights([]);
  };

  // 🔥 PDF Mapping (YOUR OLD WORKING LOGIC)
  const openDocument = (r) => {
    if (!r.source) return;

    const match = r.source.match(/doc\d+/);
    if (!match) return;

    const docId = match[0];

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

    const file = pdfMap[docId];
    if (!file) return;

    const firstPage = Array.isArray(r.page) ? r.page[0] : r.page;

    const url = `${API}/docs/${file}#page=${firstPage}`;
    window.open(url, "_blank");
  };

  // 🔥 Send message (Streaming + Insights)
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
    const updated = [...messages, userMsg];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      // Save user message
      await axios.post(`${API}/threads/${threadId}/message`, userMsg, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 🔥 Get insights
      const insightsRes = await axios.post(`${API}/insights`, {
        messages: updated
      });

      setInsights(insightsRes.data.insights || []);

      // 🔥 Stream response
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let aiText = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        aiText += chunk;

        setMessages(prev => {
          const updatedMsgs = [...prev];
          updatedMsgs[updatedMsgs.length - 1] = {
            role: "assistant",
            content: aiText
          };
          return updatedMsgs;
        });
      }

      setLoading(false);

      await axios.post(`${API}/threads/${threadId}/message`, {
        role: "assistant",
        content: aiText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchThreads();

    } catch (err) {
      console.error(err);
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
        <div className="w-64 bg-white/5 border-r border-white/10 p-4 flex flex-col">

          <button
            onClick={createThread}
            className="mb-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 transition"
          >
            + New Chat
          </button>

          <div className="flex-1 space-y-2 overflow-y-auto">
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
            className="mt-4 py-2 bg-white/10 rounded-xl text-white"
          >
            Profile
          </button>
        </div>

        {/* CHAT */}
        <div className="flex-1 flex flex-col">

          <div className="flex-1 overflow-y-auto px-6 py-10">
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
                <div className="text-gray-400 text-sm">Thinking...</div>
              )}

              <div ref={chatEndRef}></div>
            </div>
          </div>

          {/* INPUT */}
          {activeThread && (
            <div className="p-4">
              <div className="max-w-3xl mx-auto flex gap-2 bg-white/10 border border-white/20 rounded-2xl p-2">
                <input
                  value={input}
                  placeholder="Ask the research agent..."
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
          )}

        </div>

        {/* INSIGHTS */}
        <div className="w-80 bg-white/5 border-l border-white/10 p-4 overflow-y-auto">

          <h3 className="text-white text-lg mb-4">Insights</h3>

          {insights.length === 0 && (
            <div className="text-gray-400">No insights yet</div>
          )}

          {insights.map((r, i) => {
            const pages = Array.isArray(r.page) ? r.page.join(", ") : r.page;

            return (
              <div
                key={i}
                onClick={() => openDocument(r)}
                className="mb-3 p-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-[1.02] cursor-pointer transition"
              >
                <div className="text-sm text-gray-200 mb-1">
                  {r.content.substring(0, 120)}...
                </div>

                <div className="text-xs text-gray-400">
                  {r.source} • Pages {pages}
                </div>

                <div className="text-xs text-blue-400 mt-1">
                  Click to open source →
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
};

export default Dashboard;